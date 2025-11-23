import { UsersService } from '@/users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import {
  Injectable,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { randomBytes } from 'crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuthenticatedUser } from './decorator/users.decorator';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  Account,
  AccountStatus,
  AuthProvider,
} from '@/users/entities/account.entity';
import { StringValue } from 'ms';
import { Gender } from '@/users/entities/users-profile.entity';

interface JwtPayload {
  email: string;
  sub: string;
  role: string;
}

/**
 * @class AuthService
 * @description Chịu trách nhiệm xử lý tất cả logic nghiệp vụ liên quan đến xác thực,
 * bao gồm đăng ký, đăng nhập, quản lý token (JWT), OAuth, và quy trình quên mật khẩu.
 * bao gồm đăng ký, đăng nhập (cả đăng nhập hai bước), quản lý token (JWT),
 * OAuth, và quy trình quên mật khẩu.
 */
@Injectable()
export class AuthService {
  /**
   * @constructor
   * @param userService Service để tương tác với dữ liệu người dùng.
   * @param mailerService Service để gửi email.
   * @param jwtService Service để tạo và quản lý JWT.
   * @param configService Service để truy cập các biến môi trường cấu hình.
   */
  constructor(
    private userService: UsersService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Tạo một tài khoản chưa được xác thực và gửi mã xác thực qua email.
   * Nếu email đã tồn tại nhưng chưa xác thực, nó sẽ cập nhật mã xác thực mới.
   * @param registerDto DTO chứa thông tin đăng ký của người dùng.
   * @returns Một thông báo xác nhận đã gửi email.
   * @throws {ConflictException} Nếu email đã được sử dụng bởi một tài khoản đã được xác thực.
   */
  async initiateRegistration(registerDto: RegisterUserDto) {
    const { email, full_name, password, phone_number, gender } = registerDto;
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
        gender: (gender as Gender) || null,
        phoneNumber: phone_number,
        verificationCode: verificationCode,
        expiresAt,
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
   * Phương thức này được gọi bởi `LocalStrategy` để xác thực email và mật khẩu.
   * @param email Email người dùng cung cấp.
   * @param pass Mật khẩu người dùng cung cấp.
   * @returns Đối tượng người dùng (không bao gồm hash mật khẩu) nếu xác thực thành công, ngược lại trả về `null`.
   */
  async validateUser(email: string, pass: string) {
    const account = await this.userService.findAccountByEmail(email);

    // Chỉ cho phép tài khoản đã xác thực đăng nhập
    if (
      account &&
      account.is_verified &&
      account.password_hash &&
      account.status === AccountStatus.ACTIVE
    ) {
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
   * Phương thức này được gọi sau khi `validateUser` hoặc `validateOAuthLogin` thành công.
   * Nó tạo ra cả access token và refresh token, sau đó lưu bản hash của refresh token vào CSDL.
   * @param user Đối tượng người dùng đã được xác thực.
   * @returns Một đối tượng chứa `accessToken`, `refreshToken`, và thông tin cơ bản của người dùng.
   * @throws {InternalServerErrorException} Nếu thiếu các biến môi trường cấu hình JWT.
   */
  async login(user: AuthenticatedUser | Account) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: String(user.role.id),
    };

    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION_TIME',
    );
    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION_TIME',
    );

    if (
      !accessTokenSecret ||
      !accessTokenExpiresIn ||
      !refreshTokenSecret ||
      !refreshTokenExpiresIn
    ) {
      throw new InternalServerErrorException(
        'Lỗi cấu hình JWT, vui lòng kiểm tra file .env',
      );
    }

    const accessTokenOptions: JwtSignOptions = {
      secret: accessTokenSecret,
      expiresIn: accessTokenExpiresIn as StringValue,
    };

    const refreshTokenOptions: JwtSignOptions = {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenExpiresIn as StringValue,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessTokenOptions),

      this.jwtService.signAsync(payload, refreshTokenOptions),
    ]);

    await Promise.all([
      this.updateRefreshTokenHash(user.id, refreshToken),
      this.userService.updateLastLogin(user.id),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        is_profile_complete: user.userProfile?.is_profile_complete || false,
      },
    };
  }

  /**
   * Xác thực người dùng đăng nhập qua OAuth (Google, Facebook, etc.).
   * Nếu người dùng chưa tồn tại, một tài khoản mới sẽ được tạo.
   * @param payload Thông tin người dùng từ provider OAuth.
   * @param provider Tên của nhà cung cấp (e.g., 'google').
   * @returns Thông tin người dùng đã được xác thực trong hệ thống.
   */
  async validateOAuthLogin(
    payload: { email: string; firstName?: string; lastName?: string },
    provider: AuthProvider,
  ) {
    // Tải trước userProfile và role để tránh truy vấn thừa
    const account = await this.userService.findAccountByEmail(payload.email, [
      'userProfile',
      'role',
    ]);

    // Nếu tài khoản đã tồn tại
    if (account) {
      if (account.status !== AccountStatus.ACTIVE) {
        throw new ForbiddenException('Tài khoản của bạn đã bị vô hiệu hóa.');
      }

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
   * @returns Một đối tượng chứa `accessToken` mới.
   * @throws {ForbiddenException} Nếu tài khoản không tồn tại.
   */
  async refreshTokens(userID: string) {
    const account = await this.userService.findAccountById(userID);
    if (!account || account.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      );
    }

    const accessToken = await this.createAccessToken(account);

    return { accessToken };
  }

  /**
   * Đăng xuất người dùng bằng cách vô hiệu hóa refresh token.
   * @param accountID ID của tài khoản cần đăng xuất.
   * @returns Một thông báo xác nhận đăng xuất thành công.
   */
  async logout(accountID: string) {
    await this.userService.updateAccount(accountID, {
      // Fix: hashed_refresh_token should be undefined to set to NULL
      hashed_refresh_token: null,
    });

    return { message: 'Đăng xuất thành công' };
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
   * Tạo một access token mới cho người dùng.
   * @param user Đối tượng người dùng hoặc payload đã được xác thực.
   * @throws {InternalServerErrorException} Nếu thiếu các biến môi trường cấu hình Access Token.
   * @returns Một chuỗi access token mới.
   */
  async createAccessToken(user: AuthenticatedUser) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: String(user.role.id),
    };

    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION_TIME',
    );

    if (!accessTokenSecret || !accessTokenExpiresIn) {
      throw new InternalServerErrorException('Lỗi cấu hình Access Token');
    }

    return this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: accessTokenExpiresIn as StringValue,
    });
  }

  /**
   * Xử lý yêu cầu quên mật khẩu.
   * Tạo một token đặt lại mật khẩu, lưu bản hash vào CSDL và gửi email chứa token cho người dùng.
   * @param email Email của người dùng yêu cầu đặt lại mật khẩu.
   * @returns Một thông báo chung để tránh tiết lộ email nào đã được đăng ký (time-safe response).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const account = await this.userService.findAccountByEmail(email);
    if (
      !account ||
      !account.is_verified ||
      account.status !== AccountStatus.ACTIVE
    ) {
      return {
        message:
          'Nếu email này tồn tại, một hướng dẫn đặt lại mật khẩu đã được gửi.',
      };
    }

    // 1. Tạo token
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10); // Lưu bản hash để bảo mật

    // 2. Đặt thời gian hết hạn (ví dụ: 15 phút)
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // 3. Lưu token và thời gian hết hạn vào CSDL
    await this.userService.updateAccount(account.id, {
      password_reset_token: hashedToken,
      password_reset_expires: expires,
    });

    // 4. Tạo URL và gửi email
    const frontendURL = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendURL}/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Yêu cầu Đặt lại Mật khẩu',
      // Dùng template engine (như Handlebars) cho email chuyên nghiệp hơn
      html: `
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết dưới đây để tiếp tục:</p>
        <a href="${resetUrl}">Đặt lại Mật khẩu</a>
        <p>Liên kết này sẽ hết hạn sau 15 phút.</p>
        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
      `,
    });

    return {
      message:
        'Nếu email này tồn tại, một hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  }

  /**
   * Xử lý việc đặt lại mật khẩu bằng token đã được gửi qua email.
   * Phương thức này tìm kiếm một tài khoản dựa trên token đặt lại mật khẩu,
   * xác minh token chưa hết hạn, sau đó cập nhật mật khẩu của người dùng và
   * vô hiệu hóa token đã sử dụng.
   * @param token Token đặt lại mật khẩu mà người dùng cung cấp (bản gốc, chưa hash).
   * @param newPassword Mật khẩu mới mà người dùng muốn đặt.
   * @returns Một đối tượng chứa thông báo xác nhận mật khẩu đã được cập nhật thành công.
   * @throws {BadRequestException} Nếu token không hợp lệ hoặc đã hết hạn.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // 1. Hash token nhận được từ client để so sánh với CSDL
    const hashedToken = await bcrypt.hash(token, 10);

    // 2. Tìm tài khoản dựa trên token đã hash và còn hạn
    const account =
      await this.userService.findAccountByValidResetToken(hashedToken);

    if (!account) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn.');
    }

    // 3. Hash mật khẩu mới và cập nhật
    const newPasswordHash = await this.userService.hashPassword(newPassword);

    await this.userService.updateAccount(account.id, {
      password_hash: newPasswordHash,
      // Vô hiệu hóa token sau khi sử dụng
      password_reset_token: null,
      password_reset_expires: null,
    });

    return { message: 'Mật khẩu đã được cập nhật thành công.' };
  }

  /**
   * Bắt đầu quá trình đăng nhập hai bước (2FA).
   * Xác thực email và mật khẩu, sau đó gửi mã OTP qua email nếu thông tin đăng nhập hợp lệ.
   * @param email Email của người dùng.
   * @param pass Mật khẩu của người dùng.
   * @returns Một thông báo xác nhận đã gửi mã OTP.
   * @throws {UnauthorizedException} Nếu email hoặc mật khẩu không chính xác.
   */
  async loginInitiate(email: string, pass: string) {
    // 1. Dùng lại validateUser để kiểm tra mật khẩu
    const account = await this.validateUser(email, pass);
    if (!account) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu.');
    }

    // 2. Tạo và lưu mã OTP (tái sử dụng logic của register)
    const verificationCode = randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Mã OTP có hạn 10 phút

    await this.userService.updateAccount(account.id, {
      verification_code: verificationCode,
      verification_code_expires_at: expiresAt,
    });

    // 3. Gửi email
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã Xác thực Đăng nhập',
      text: `Mã xác thực đăng nhập của bạn là: ${verificationCode}. Mã này sẽ hết hạn sau 10 phút.`,
    });

    return {
      message:
        'Mật khẩu chính xác. Một mã xác thực đã được gửi đến email của bạn.',
    };
  }

  /**
   * Hoàn tất quá trình đăng nhập hai bước bằng mã OTP.
   * Xác thực mã OTP, sau đó tạo và trả về token truy cập và token làm mới nếu mã hợp lệ.
   * @param email Email của người dùng.
   * @param code Mã OTP người dùng cung cấp.
   * @returns Một đối tượng chứa `accessToken`, `refreshToken`, và thông tin người dùng.
   * @throws {UnauthorizedException} Nếu tài khoản không tồn tại, mã OTP không hợp lệ hoặc đã hết hạn.
   */
  async loginComplete(email: string, code: string) {
    const account = await this.userService.findAccountByEmail(email, [
      'userProfile',
      'role',
    ]);
    if (!account || account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      );
    }

    if (
      !account.verification_code ||
      account.verification_code_expires_at < new Date() ||
      account.verification_code !== code
    ) {
      throw new UnauthorizedException('Sai mã xác thực hoặc đã hết hạn.');
    }

    await this.userService.updateAccount(account.id, {
      verification_code: undefined,
      verification_code_expires_at: undefined,
    });

    return this.login(account);
  }
}
