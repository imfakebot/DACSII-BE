import { UsersService } from '@/user/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import {
  Injectable,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Account } from '@/user/entities/account.entity';
import { StringValue } from 'ms';
import { AccountStatus } from '@/user/enum/account-status.enum';
import { AuthProvider } from '@/user/enum/auth-provider.enum';
import { AuthenticatedUser } from './interface/authenicated-user.interface';
import { Gender } from '@/user/enum/gender.enum';
import { JwtPayload } from './interface/jwtpayload.interface';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';



/**
 * @class AuthService
 * @description Chịu trách nhiệm xử lý tất cả logic nghiệp vụ liên quan đến xác thực,
 * bao gồm đăng ký, đăng nhập (cả đăng nhập hai bước), quản lý token (JWT),
 * OAuth, và các quy trình quên/đặt lại mật khẩu.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /**
   * @constructor
   * @param {UsersService} userService - Service để tương tác với dữ liệu người dùng.
   * @param {MailerService} mailerService - Service để gửi email.
   * @param {JwtService} jwtService - Service để tạo và quản lý JWT.
   * @param {ConfigService} configService - Service để truy cập các biến môi trường cấu hình.
   */
  constructor(
    private userService: UsersService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) { }

  /**
   * @method initiateRegistration
   * Tạo một tài khoản chưa được xác thực và gửi mã xác thực qua email.
   * Nếu email đã tồn tại nhưng chưa xác thực, nó sẽ cập nhật mã xác thực mới.
   * @param {RegisterUserDto} registerDto - DTO chứa thông tin đăng ký của người dùng.
   * @returns {Promise<{ message: string }>} - Một thông báo xác nhận đã gửi email.
   * @throws {ConflictException} Nếu email đã được sử dụng bởi một tài khoản đã được xác thực.
   */
  async initiateRegistration(
    registerDto: RegisterUserDto,
  ): Promise<{ message: string }> {
    const { email, full_name, password, phone_number, gender } = registerDto;
    this.logger.log(`Initiating registration for email: ${email}`);
    const existingAccount = await this.userService.findAccountByEmail(email);

    // 1. Kiểm tra xem email đã được xác thực chưa
    if (existingAccount && existingAccount.is_verified) {
      this.logger.warn(`Email ${email} is already verified.`);
      throw new ConflictException('Email này đã được sử dụng.');
    }

    // 2. Kiểm tra xem SĐT đã tồn tại hay chưa.
    const profileWithPhone =
      await this.userService.findProfileByPhoneNumber(phone_number);

    // Nếu SĐT đã tồn tại, kiểm tra các trường hợp xung đột:
    if (
      profileWithPhone &&
      // TH1: Tài khoản của SĐT đó đã được xác thực.
      (profileWithPhone.account.is_verified === true ||
        // TH2: SĐT thuộc về một tài khoản chưa xác thực KHÁC.
        // (Cho phép ghi đè nếu SĐT thuộc về chính tài khoản email đang đăng ký lại).
        !existingAccount ||
        profileWithPhone.account.id !== existingAccount.id)
    ) {
      this.logger.warn(`Phone number ${phone_number} is already in use.`);
      throw new ConflictException('Số điện thoại này đã được sử dụng.');
    }

    // 3. Nếu tất cả kiểm tra đều qua, tiến hành tạo/cập nhật
    const verificationCode = randomBytes(3).toString('hex').toUpperCase();
    this.logger.debug(`Generated verification code for ${email}`);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    const passwordHash = await this.userService.hashPassword(password);

    if (existingAccount) {
      this.logger.log(`Updating unverified account for ${email}`);
      await this.userService.updateUnverifiedAccount(existingAccount.id, {
        password_hash: passwordHash,
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt,
        // Gửi dữ liệu profile mới để cập nhật, giải quyết lỗi SĐT bị "kẹt"
        profile_data: {
          full_name: full_name,
          phone_number: phone_number,
          gender: (gender as Gender) || null,
        },
      });
    } else {
      this.logger.log(`Creating new unverified user for ${email}`);
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

    this.logger.log(`Sending verification email to ${email}`);
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã Xác Thực Đăng Ký Tài Khoản',
      template: './welcome',
      context: {
        name: full_name,
        code: verificationCode,
        expires: '15',
        currentYear: new Date().getFullYear(),
      },
    });

    return { message: 'Mã xác thực đã được gửi đến email của bạn.' };
  }

  /**
   * @method completeRegistration
   * Hoàn tất quá trình đăng ký bằng cách xác thực mã code.
   * Cập nhật trạng thái tài khoản thành đã xác thực nếu mã hợp lệ.
   * @param {string} email - Email của tài khoản cần xác thực.
   * @param {string} code - Mã xác thực được gửi từ người dùng.
   * @returns {Promise<{ message: string }>} - Một thông báo xác thực thành công.
   * @throws {ConflictException} Nếu mã không hợp lệ, hết hạn, hoặc tài khoản không tồn tại.
   */
  async completeRegistration(
    email: string,
    code: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Completing registration for ${email}`);
    const account = await this.userService.findAccountByEmail(email);
    if (!account || account.is_verified) {
      this.logger.warn(`Invalid registration completion attempt for ${email}`);
      throw new ConflictException('Yêu cầu xác thực không hợp lệ.');
    }

    if (
      account.verification_code !== code ||
      (account.verification_code_expires_at &&
        account.verification_code_expires_at < new Date())
    ) {
      this.logger.warn(`Invalid or expired verification code for ${email}`);
      throw new ConflictException('Mã xác thực không hợp lệ hoặc đã hết hạn.');
    }

    await this.userService.verifyAccount(account.id);
    this.logger.log(`Account ${email} verified successfully`);

    return { message: 'Tài khoản của bạn đã được xác thực thành công.' };
  }

  /**
   * @method validateUser
   * Kiểm tra thông tin đăng nhập của người dùng.
   * Phương thức này được gọi bởi `LocalStrategy` để xác thực email và mật khẩu.
   * @param {string} email - Email người dùng cung cấp.
   * @param {string} pass - Mật khẩu người dùng cung cấp.
   * @returns {Promise<Omit<Account, 'password_hash'> | null>} - Đối tượng người dùng (không bao gồm hash mật khẩu) nếu xác thực thành công, ngược lại trả về `null`.
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<Account, 'password_hash'> | null> {
    this.logger.log(`Validating user ${email}`);
    const account = await this.userService.findAccountByEmail(email, [
      'role',
      'userProfile',
      'userProfile.branch',
    ]);

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
        this.logger.log(`User ${email} validated successfully`);
        return result as unknown as Omit<Account, 'password_hash'>;
      }
    }
    this.logger.warn(`User ${email} validation failed`);
    return null;
  }

  /**
   * @method login
   * Tạo và ký một JWT cho người dùng đã được xác thực.
   * Phương thức này được gọi sau khi `validateUser` hoặc `validateOAuthLogin` thành công.
   * Nó tạo ra cả access token và refresh token, sau đó lưu bản hash của refresh token vào CSDL.
   * @param {AuthenticatedUser | Account} user - Đối tượng người dùng đã được xác thực.
   * @returns {Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; is_profile_complete: boolean; } }>} - Một đối tượng chứa `accessToken`, `refreshToken`, và thông tin cơ bản của người dùng.
   * @throws {InternalServerErrorException} Nếu thiếu các biến môi trường cấu hình JWT.
   */
  async login(user: AuthenticatedUser | Account) {
    this.logger.log(`Logging in user ${user.email}`);
    const userProfile = (user as Account).userProfile;
    const roleName = (user.role as unknown as { name: string }).name;
    
    // Lấy branch_id: với Staff thì từ userProfile.branch, với Manager thì từ Branch table
    let branchId: string | undefined = userProfile?.branch?.id || undefined;
    
    // Nếu là branch_manager và chưa có branchId, tìm branch mà họ quản lý
    if (!branchId && userProfile && roleName === 'branch_manager') {
      // userProfile.id là manager_id trong Branch table
      const managedBranch = await this.userService.findBranchByManagerProfileId(userProfile.id);
      branchId = managedBranch?.id || undefined;
      this.logger.log(`Branch manager ${user.email} manages branch: ${branchId}`);
    }

    const payload: JwtPayload & { branch_id?: string } = {
      email: user.email,
      sub: user.id,
      role: roleName,
      branch_id: branchId,
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
      this.logger.error('JWT configuration is missing');
      throw new InternalServerErrorException(
        'Lỗi cấu hình JWT, vui lòng kiểm tra file .env',
      );
    }

    this.logger.debug(`Generating tokens for user ${user.email}`);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresIn as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresIn as StringValue,
      }),
    ]);

    await Promise.all([
      this.updateRefreshTokenHash(user.id, refreshToken),
      this.userService.updateLastLogin(user.id),
    ]);

    this.logger.log(`User ${user.email} logged in successfully`);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: roleName,
        is_profile_complete:
          user.userProfile &&
            typeof user.userProfile === 'object' &&
            'is_profile_complete' in user.userProfile
            ? ((user.userProfile as { is_profile_complete?: boolean })
              .is_profile_complete ?? false)
            : false,
        branch_id: branchId,
      },
    };
  }

  /**
   * @method validateOAuthLogin
   * Xác thực người dùng đăng nhập qua OAuth (Google, Facebook, etc.).
   * Nếu người dùng chưa tồn tại, một tài khoản mới sẽ được tạo.
   * @param {object} payload - Thông tin người dùng từ provider OAuth.
   * @param {AuthProvider} provider - Tên của nhà cung cấp (e.g., 'google').
   * @returns {Promise<Omit<Account, 'password_hash'>>} - Thông tin người dùng đã được xác thực trong hệ thống.
   */
  async validateOAuthLogin(
    payload: { email: string; firstName?: string; lastName?: string },
    provider: AuthProvider,
  ): Promise<Omit<Account, 'password_hash'>> {
    this.logger.log(`Validating OAuth login for ${payload.email}`);
    // Tải trước userProfile và role để tránh truy vấn thừa
    const account = await this.userService.findAccountByEmail(payload.email, [
      'userProfile',
      'role',
    ]);

    // Nếu tài khoản đã tồn tại
    if (account) {
      if (account.status !== AccountStatus.ACTIVE) {
        this.logger.warn(
          `OAuth login attempt for disabled account ${payload.email}`,
        );
        throw new ForbiddenException('Tài khoản của bạn đã bị vô hiệu hóa.');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...accountDetails } = account;
      this.logger.log(`Existing OAuth user ${payload.email} found`);
      return accountDetails as unknown as Omit<Account, 'password_hash'>; // userProfile đã được tải cùng với cờ is_profile_complete
    }

    // Nếu tài khoản chưa tồn tại, tạo một tài khoản mới
    this.logger.log(`Creating new OAuth user for ${payload.email}`);
    const newUserAccount = await this.userService.createOAuthUser({
      email: payload.email,
      fullName: [payload.firstName, payload.lastName].filter(Boolean).join(' '),
      provider: provider,
    });

    // newUserAccount từ createOAuthUser đã bao gồm userProfile và role
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...accountDetails } = newUserAccount;
    return accountDetails as unknown as Omit<Account, 'password_hash'>;
  }

  /**
   * @method refreshTokens
   * Xác thực người dùng và tạo ra một access token mới.
   * Logic kiểm tra refresh token đã được JwtRefreshGuard xử lý.
   * @param {string} userID - ID người dùng lấy từ payload của refresh token đã được xác thực.
   * @returns {Promise<{ accessToken: string }>} - Một đối tượng chứa `accessToken` mới.
   * @throws {ForbiddenException} Nếu tài khoản không tồn tại.
   */
  async refreshTokens(userID: string): Promise<{ accessToken: string }> {
    this.logger.log(`Refreshing tokens for user ${userID}`);
    // Tải tài khoản cùng với vai trò để tạo token
    const account = await this.userService.findAccountById(userID, [
      'role',
      'userProfile',
      'userProfile.branch',
    ]);
    if (!account || account.status !== AccountStatus.ACTIVE) {
      this.logger.warn(
        `Token refresh attempt for non-existent or inactive user ${userID}`,
      );
      throw new ForbiddenException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      );
    }

    const accessToken = await this.createAccessToken(
      account as unknown as AuthenticatedUser,
    );

    this.logger.log(`Tokens refreshed for user ${userID}`);
    return { accessToken };
  }

  /**
   * @method logout
   * Đăng xuất người dùng bằng cách vô hiệu hóa refresh token và revoke Google OAuth token.
   * @param {string} accountID - ID của tài khoản cần đăng xuất.
   * @returns {Promise<{ message: string }>} - Một thông báo xác nhận đăng xuất thành công.
   */
  async logout(accountID: string): Promise<{ message: string }> {
    this.logger.log(`Logging out user ${accountID}`);

    // Lấy thông tin user để revoke Google token nếu có
    const account = await this.userService.findAccountById(accountID);

    // Revoke Google OAuth token nếu user đăng nhập bằng Google
    if (account?.google_access_token && account.provider === AuthProvider.GOOGLE) {
      try {
        const revokeUrl = this.configService.get<string>('GOOGLE_REVOKE_URL');
        if (!revokeUrl) {
          this.logger.error('GOOGLE_REVOKE_URL is not configured');
          throw new InternalServerErrorException('Lỗi cấu hình Google OAuth');
        }
        await firstValueFrom(
          this.httpService.post(revokeUrl, null, {
            params: { token: account.google_access_token },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }),
        );
        this.logger.log(`Revoked Google token for user ${accountID}`);
      } catch (error) {
        this.logger.warn(`Failed to revoke Google token: `, error);
      }
    }

    await this.userService.updateAccount(accountID, {
      hashed_refresh_token: null,
      google_access_token: null,
    });

    return { message: 'Đăng xuất thành công' };
  }

  /**
   * @method saveGoogleAccessToken
   * Lưu Google OAuth access token để có thể revoke khi logout.
   * @param {string} accountID - ID của tài khoản.
   * @param {string} accessToken - Google access token.
   */
  async saveGoogleAccessToken(accountID: string, accessToken: string): Promise<void> {
    this.logger.debug(`Saving Google access token for user ${accountID}`);
    await this.userService.updateAccount(accountID, {
      google_access_token: accessToken,
    });
  }

  /**
   * @private
   * Hàm helper private để hash và cập nhật refresh token trong DB.
   * @param {string} accountId - ID của tài khoản (kiểu chuỗi UUID).
   * @param {string} refreshToken - Chuỗi refresh token cần hash và lưu.
   */
  private async updateRefreshTokenHash(
    accountId: string,
    refreshToken: string,
  ) {
    this.logger.debug(`Updating refresh token hash for user ${accountId}`);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateAccount(accountId, {
      hashed_refresh_token: hashedRefreshToken,
    });
  }

  /**
   * @method createAccessToken
   * Tạo một access token mới cho người dùng.
   * @param {AuthenticatedUser} user - Đối tượng người dùng hoặc payload đã được xác thực.
   * @returns {Promise<string>} - Một chuỗi access token mới.
   * @throws {InternalServerErrorException} Nếu thiếu các biến môi trường cấu hình Access Token.
   */
  async createAccessToken(user: AuthenticatedUser | Account): Promise<string> {
    this.logger.debug(`Creating new access token for user ${user.id}`);
    const userProfile = (user as Account).userProfile;
    const branchId = userProfile?.branch?.id || null;
    const roleName = (user.role as unknown as { name: string }).name;

    const payload = {
      email: user.email,
      sub: user.id,
      role: roleName,
      branch_id: branchId,
    };

    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION_TIME',
    );

    if (!accessTokenSecret || !accessTokenExpiresIn) {
      this.logger.error('Access token configuration is missing');
      throw new InternalServerErrorException('Lỗi cấu hình Access Token');
    }

    return this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: accessTokenExpiresIn as StringValue,
    });
  }

  /**
   * @method forgotPassword
   * Xử lý yêu cầu quên mật khẩu.
   * Tạo một token đặt lại mật khẩu, lưu bản hash vào CSDL và gửi email chứa token cho người dùng.
   * @param {string} email - Email của người dùng yêu cầu đặt lại mật khẩu.
   * @returns {Promise<{ message: string }>} - Một thông báo chung để tránh tiết lộ email nào đã được đăng ký (time-safe response).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    this.logger.log(`Forgot password request for ${email}`);
    const account = await this.userService.findAccountByEmail(email);
    if (
      !account ||
      !account.is_verified ||
      account.status !== AccountStatus.ACTIVE
    ) {
      this.logger.warn(
        `Forgot password attempt for non-existent, unverified, or inactive account ${email}`,
      );
      return {
        message:
          'Nếu email này tồn tại, một hướng dẫn đặt lại mật khẩu đã được gửi.',
      };
    }

    // 1. Tạo token
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(resetToken).digest('hex');

    // 2. Đặt thời gian hết hạn (ví dụ: 15 phút)
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // 3. Lưu token và thời gian hết hạn vào CSDL
    this.logger.debug(`Saving password reset token for ${email}`);
    await this.userService.updateAccount(account.id, {
      password_reset_token: hashedToken,
      password_reset_expires: expires,
    });

    // 4. Tạo URL và gửi email
    const frontendURL = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendURL}/reset-password?token=${resetToken}`;

    this.logger.log(`Sending password reset email to ${email}`);
    await this.mailerService.sendMail({
      to: email,
      subject: 'Yêu cầu Đặt lại Mật khẩu',
      template: './reset-password',
      context: {
        resetUrl: resetUrl,
        currentYear: new Date().getFullYear(),
      },
    });

    return {
      message:
        'Nếu email này tồn tại, một hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  }

  /**
   * @method resetPassword
   * Xử lý việc đặt lại mật khẩu bằng token đã được gửi qua email.
   * Phương thức này tìm kiếm một tài khoản dựa trên token đặt lại mật khẩu,
   * xác minh token chưa hết hạn, sau đó cập nhật mật khẩu của người dùng và
   * vô hiệu hóa token đã sử dụng.
   * @param {string} token - Token đặt lại mật khẩu mà người dùng cung cấp (bản gốc, chưa hash).
   * @param {string} newPassword - Mật khẩu mới mà người dùng muốn đặt.
   * @returns {Promise<{ message: string }>} - Một đối tượng chứa thông báo xác nhận mật khẩu đã được cập nhật thành công.
   * @throws {BadRequestException} Nếu token không hợp lệ hoặc đã hết hạn.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    this.logger.log('Resetting password');
    // 1. Hash token nhận được từ client để so sánh với CSDL
    const hashedToken = createHash('sha256').update(token).digest('hex');

    // 2. Tìm tài khoản dựa trên token đã hash và còn hạn
    const account =
      await this.userService.findAccountByValidResetToken(hashedToken);

    if (!account) {
      this.logger.warn('Invalid or expired password reset token');
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn.');
    }

    // 3. Hash mật khẩu mới và cập nhật
    this.logger.log(`Updating password for user ${account.id}`);
    const newPasswordHash = await this.userService.hashPassword(newPassword);

    await this.userService.updateAccount(account.id, {
      password_hash: newPasswordHash,
      // Vô hiệu hóa token sau khi sử dụng
      password_reset_token: null,
      password_reset_expires: null,
    });

    this.logger.log(`Password updated successfully for user ${account.id}`);
    return { message: 'Mật khẩu đã được cập nhật thành công.' };
  }

  /**
   * @method loginInitiate
   * Bắt đầu quá trình đăng nhập hai bước (2FA).
   * Xác thực email và mật khẩu, sau đó gửi mã OTP qua email nếu thông tin đăng nhập hợp lệ.
   * @param {string} email - Email của người dùng.
   * @param {string} pass - Mật khẩu của người dùng.
   * @returns {Promise<{ message: string }>} - Một thông báo xác nhận đã gửi mã OTP.
   * @throws {UnauthorizedException} Nếu email hoặc mật khẩu không chính xác.
   */
  async loginInitiate(
    email: string,
    pass: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Initiating 2FA login for ${email}`);
    // 1. Dùng lại validateUser để kiểm tra mật khẩu
    const account = await this.validateUser(email, pass);
    if (!account) {
      this.logger.warn(
        `Invalid credentials for 2FA login attempt for ${email}`,
      );
      throw new UnauthorizedException('Sai email hoặc mật khẩu.');
    }

    // 2. Tạo và lưu mã OTP (tái sử dụng logic của register)
    const verificationCode = randomBytes(3).toString('hex').toUpperCase();
    this.logger.debug(`Generated 2FA code for ${email}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Mã OTP có hạn 10 phút

    await this.userService.updateAccount(account.id, {
      verification_code: verificationCode,
      verification_code_expires_at: expiresAt,
    });

    // 3. Gửi email
    this.logger.log(`Sending 2FA email to ${email}`);
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã Xác thực Đăng nhập',
      template: './login-verification', // Sử dụng template
      context: {
        name: account.userProfile?.full_name || email, // Lấy tên người dùng nếu có
        code: verificationCode,
        expires: '10', // Thời gian hết hạn là 10 phút
        currentYear: new Date().getFullYear(),
      },
    });

    return {
      message:
        'Mật khẩu chính xác. Một mã xác thực đã được gửi đến email của bạn.',
    };
  }

  /**
   * @method loginComplete
   * Hoàn tất quá trình đăng nhập hai bước bằng mã OTP.
   * Xác thực mã OTP, sau đó tạo và trả về token truy cập và token làm mới nếu mã hợp lệ.
   * @param {string} email - Email của người dùng.
   * @param {string} code - Mã OTP người dùng cung cấp.
   * @returns {Promise<object>} - Một đối tượng chứa `accessToken`, `refreshToken`, và thông tin người dùng.
   * @throws {UnauthorizedException} Nếu tài khoản không tồn tại, mã OTP không hợp lệ hoặc đã hết hạn.
   */
  async loginComplete(email: string, code: string) {
    this.logger.log(`Completing 2FA login for ${email}`);
    const account = await this.userService.findAccountByEmail(email, [
      'role',
      'userProfile',
      'userProfile.branch',
    ]);
    if (!account || account.status !== AccountStatus.ACTIVE) {
      this.logger.warn(
        `2FA login attempt for non-existent or inactive account ${email}`,
      );
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      );
    }

    if (
      !account.verification_code ||
      !account.verification_code_expires_at ||
      account.verification_code_expires_at < new Date() ||
      account.verification_code !== code
    ) {
      this.logger.warn(`Invalid or expired 2FA code for ${email}`);
      throw new UnauthorizedException('Sai mã xác thực hoặc đã hết hạn.');
    }

    await this.userService.updateAccount(account.id, {
      verification_code: null,
      verification_code_expires_at: null,
    });

    this.logger.log(`2FA login successful for ${email}`);
    return this.login(account);
  }
}
