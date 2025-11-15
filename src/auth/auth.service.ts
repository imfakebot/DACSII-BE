import { UsersService } from '@/users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, ForbiddenException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { randomBytes } from 'crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuthenticatedUser } from './decorator/users.decorator';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Account } from '@/users/entities/account.entity';
import { StringValue } from 'ms'


interface JwtPayload {
  email: string,
  sub: string,
  role: string
}
/**
 * AuthService chịu trách nhiệm xử lý logic liên quan đến xác thực người dùng,
 * bao gồm đăng ký, xác thực email, đăng nhập và tạo token JWT.
 */
@Injectable()
export class AuthService {
  /**
   * @param userService Service để tương tác với dữ liệu người dùng.
   * @param mailerService Service để gửi email.
   * @param jwtService Service để tạo và quản lý JWT.
   */
  constructor(
    private userService: UsersService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  /**
   * Bắt đầu quá trình đăng ký.
   * Tạo một tài khoản chưa được xác thực và gửi mã xác thực qua email.
   * @param registerDto DTO chứa thông tin đăng ký của người dùng.
   * @returns Một thông báo xác nhận đã gửi email.
   * @throws {ConflictException} Nếu email đã được sử dụng hoặc thiếu thông tin.
   */
  async initiateRegistration(registerDto: RegisterUserDto) {
    const {
      email,
      full_name,
      password,
      phoneNumber,
      gender,
      street, ward_id, city_id,
    } = registerDto;
    const existingAccount = await this.userService.findAccountByEmail(email);
    if (existingAccount && existingAccount.is_verified) {
      throw new ConflictException('Email này đã được sử dụng.');
    }

    const verificationCode = randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    const passwordHash = await this.userService.hashPassword(password);

    if (existingAccount) {
      await this.userService.updateUnverifiedAccount(existingAccount.id, {
        password_hash: passwordHash,
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt,
      });
    } else {
      await this.userService.createUnverifiedUser({
        email: email,
        passwordHash,
        fullName: full_name,
        bio: null,
        gender: gender || null,
        phoneNumber: phoneNumber,
        verificationCode: verificationCode,
        expiresAt,
        street: street,
        ward_id: ward_id,
        city_id: city_id,
      });
    }

    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã Xác Thực Đăng Ký Tài Khoản',
      text: `Mã xác thực của bạn là: ${verificationCode}. Mã này sẽ hết hạn sau 15 phút.`,
    });

    return { message: 'Mã xác thực đã được gửi đến email của bạn.' };
  }

  /**
   * Hoàn tất quá trình đăng ký bằng cách xác thực mã code.
   * Cập nhật trạng thái tài khoản thành đã xác thực nếu mã hợp lệ.
   * @param email Email của tài khoản cần xác thực.
   * @param code Mã xác thực được gửi từ người dùng.
   * @returns Một thông báo xác thực thành công.
   * @throws {ConflictException} Nếu mã không hợp lệ, hết hạn, hoặc tài khoản không tồn tại.
   */
  async completeRegistration(email: string, code: string) {
    const account = await this.userService.findAccountByEmail(email);
    if (!account || account.is_verified) {
      throw new ConflictException('Yêu cầu xác thực không hợp lệ.');
    }

    if (
      account.verification_code !== code ||
      (account.verification_code_expires_at &&
        account.verification_code_expires_at < new Date())
    ) {
      throw new ConflictException('Mã xác thực không hợp lệ hoặc đã hết hạn.');
    }

    await this.userService.verifyAccount(account.id);

    return { message: 'Tài khoản của bạn đã được xác thực thành công.' };
  }

  /**
   * Kiểm tra thông tin đăng nhập của người dùng.
   * Phương thức này được gọi tự động bởi LocalStrategy.
   * @param email Email người dùng
   * @param pass Mật khẩu người dùng
   * @returns Thông tin người dùng nếu hợp lệ, ngược lại trả về null.
   */
  async validateUser(email: string, pass: string) {
    const account = await this.userService.findAccountByEmail(email);

    // Chỉ cho phép tài khoản đã xác thực đăng nhập
    if (account && account.is_verified && account.password_hash) {
      const isMatch = await this.userService.comparePassword(
        pass,
        account.password_hash,
      );
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...result } = account;
        return result;
      }
    }
    return null;
  }

  /**
   * Tạo và ký một JWT cho người dùng đã được xác thực.
   * Phương thức này được gọi sau khi `validateUser` thành công.
   * @param user Đối tượng người dùng đã được xác thực từ `validateUser`.
   * @returns Một đối tượng chứa access_token.
   */
  async login(user: AuthenticatedUser | Account) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: String(user.role.id),
    };

    const accessTokenSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME');
    const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME');

    if (!accessTokenSecret || !accessTokenExpiresIn || !refreshTokenSecret || !refreshTokenExpiresIn) {
      throw new InternalServerErrorException('Lỗi cấu hình JWT, vui lòng kiểm tra file .env');
    }

    const accessTokenOptions: JwtSignOptions = {
      secret: accessTokenSecret,
      expiresIn: accessTokenExpiresIn as StringValue,
    };

    const refreshTokenOptions: JwtSignOptions = {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenExpiresIn as StringValue,
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessTokenOptions),

      this.jwtService.signAsync(payload, refreshTokenOptions)
    ])


    await this.updateRefreshTokenHash(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        is_profile_complete: user.userProfile?.is_profile_complete || false
      }
    };
  }

  /**
   * Xác thực người dùng đăng nhập qua OAuth (Google, Facebook, etc.).
   * Nếu người dùng chưa tồn tại, một tài khoản mới sẽ được tạo.
   * @param payload Thông tin người dùng từ provider OAuth.
   * @param provider Tên của nhà cung cấp (e.g., 'google').
   * @returns Thông tin người dùng đã được xác thực.
   */
  async validateOAuthLogin(payload: { email: string, firstName?: string, lastName?: string }, provider: string) {
    // Tải trước userProfile và role để tránh truy vấn thừa
    const account = await this.userService.findAccountByEmail(payload.email, ['userProfile', 'role']);

    // Nếu tài khoản đã tồn tại
    if (account) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...accountDetails } = account;
      return accountDetails; // userProfile đã được tải cùng với cờ is_profile_complete
    }

    // Nếu tài khoản chưa tồn tại, tạo một tài khoản mới
    const newUserAccount = await this.userService.createOAuthUser({
      email: payload.email,
      fullName: [payload.firstName, payload.lastName].filter(Boolean).join(' '),
      provider: provider,
    });

    // newUserAccount từ createOAuthUser đã bao gồm userProfile và role
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...accountDetails } = newUserAccount;
    return accountDetails;
  }

  /**
   * Xác thực người dùng và tạo ra một access token mới.
   * Logic kiểm tra refresh token đã được JwtRefreshGuard xử lý.
   * @param userId ID người dùng lấy từ payload của refresh token đã được xác thực.
   * @returns Một đối tượng chứa accessToken mới.
   */
  async refreshTokens(userID: string) {
    const account = await this.userService.findAccountById(userID);
    if (!account) {
      throw new ForbiddenException('Tài khoản không tồn tại');
    }

    const accessToken = await this.createAccessToken(account);

    return { accessToken };
  }

  async logout(accountID: string) {
    await this.userService.updateAccount(accountID, { // Fix: hashed_refresh_token should be undefined to set to NULL
      hashed_refresh_token: null,
    });

    return { message: "Đăng xuất thành công" }
  }

  /**
   * Hàm helper private để hash và cập nhật refresh token trong DB.
   * @param accountId ID của tài khoản (kiểu chuỗi UUID).
   * @param refreshToken Chuỗi refresh token cần hash và lưu.
   */
  private async updateRefreshTokenHash(
    accountId: string,
    refreshToken: string,
  ) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateAccount(accountId, {
      hashed_refresh_token: hashedRefreshToken,
    });
  }

  /**
   * HÀM MỚI (hoặc tách ra từ hàm login): Chỉ tạo Access Token.
   * Rất hữu ích cho việc làm mới token mà không cần tạo lại mọi thứ.
   * @param user Đối tượng người dùng hoặc payload đã được xác thực.
   * @returns Một chuỗi access token mới.
   */
  async createAccessToken(user: AuthenticatedUser) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: String(user.role.id),
    }

    const accessTokenSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME');

    if (!accessTokenSecret || !accessTokenExpiresIn) {
      throw new InternalServerErrorException('Lỗi cấu hình Access Token');
    }

    return this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: accessTokenExpiresIn as StringValue,
    });
  }
}