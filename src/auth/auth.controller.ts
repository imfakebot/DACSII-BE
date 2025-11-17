import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

import { AuthenticatedUser, User } from './decorator/users.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginCompleteDto } from './dto/login-complete.dto';

/**
 * Interface để định nghĩa cấu trúc của một Request đã được xác thực,
 * đảm bảo `req.user` có kiểu dữ liệu chặt chẽ.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: { id: string; name?: string };
  };
}

/**
 * @controller AuthController
 * @description Xử lý các yêu cầu liên quan đến xác thực người dùng,
 * bao gồm đăng ký, đăng nhập, đăng xuất, xác thực qua Google và làm mới token.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    /**
     * @param {AuthService} authService - Service xử lý logic nghiệp vụ xác thực.
     * @param {ConfigService} configService - Service để truy cập các biến môi trường.
     */
    private readonly configService: ConfigService,
  ) {}

  /**
   * @route POST /auth/register/initiate
   * @description Bắt đầu quá trình đăng ký. Nhận thông tin người dùng và gửi email xác thực.
   * @param {RegisterUserDto} registerDto - DTO chứa thông tin đăng ký của người dùng.
   * @returns {Promise<{ message: string }>} - Thông báo về việc đã gửi email xác thực.
   */
  @Post('register/initiate')
  @ApiOperation({ summary: 'Bắt đầu quá trình đăng ký' })
  @ApiResponse({ status: 200, description: 'Gửi mã xác thực thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (Validation Error).',
  })
  @ApiResponse({
    status: 409,
    description: 'Email đã được sử dụng bởi một tài khoản đã xác thực.',
  })
  @ApiBody({ type: RegisterUserDto })
  @HttpCode(HttpStatus.OK)
  initiateRegistration(@Body() registerDto: RegisterUserDto) {
    return this.authService.initiateRegistration(registerDto);
  }

  /**
   * @route POST /auth/register/complete
   * @description Hoàn tất quá trình đăng ký bằng cách xác thực mã được gửi qua email.
   * @param {VerifyEmailDto} verifyEmailDto - DTO chứa email và mã xác thực.
   * @returns {Promise<User>} - Thông tin người dùng sau khi đăng ký thành công.
   */
  @Post('register/complete')
  @ApiOperation({ summary: 'Hoàn thành đăng ký bằng mã xác thực' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (Validation Error).',
  })
  @ApiResponse({ status: 409, description: 'Mã không hợp lệ hoặc đã hết hạn.' })
  @HttpCode(HttpStatus.OK)
  completeRegistration(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.completeRegistration(
      verifyEmailDto.email,
      verifyEmailDto.verificationCode,
    );
  }

  // /**
  //  * @route POST /auth/login
  //  * @description Xác thực và đăng nhập người dùng bằng email và mật khẩu.
  //  * `LocalAuthGuard` sẽ xử lý việc xác thực thông tin đăng nhập.
  //  * Nếu thành công, trả về access token và thiết lập refresh token trong một httpOnly cookie.
  //  * @param {AuthenticatedUser} user - Đối tượng người dùng đã được xác thực bởi Guard.
  //  * @param {Response} res - Đối tượng response của Express để thiết lập cookie.
  //  * @returns {Promise<{ accessToken: string; user: object }>} - Access token và thông tin cơ bản của người dùng.
  //  */
  // @UseGuards(LocalAuthGuard)
  // @Post('login')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  // @ApiBody({
  //   schema: {
  //     properties: {
  //       email: { type: 'string', example: 'user@example.com' },
  //       password: { type: 'string', example: 'password123' },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: 200,
  //   description:
  //     'Đăng nhập thành công, trả về access token và thông tin người dùng.',
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: 'Thông tin đăng nhập không chính xác.',
  // })
  // async login(
  //   @User() user: AuthenticatedUser,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const loginData = await this.authService.login(user);

  //   res.cookie('refresh_token', loginData.refreshToken, {
  //     httpOnly: true,
  //     secure: this.configService.get('NODE_ENV') === 'production',
  //     sameSite: 'strict',
  //     expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
  //     path: '/',
  //   });

  //   return {
  //     accessToken: loginData.accessToken,
  //     user: loginData.user,
  //   };
  // }

  /**
   * @route GET /auth/google
   * @description Bắt đầu luồng xác thực với Google.
   * `GoogleAuthGuard` sẽ tự động chuyển hướng người dùng đến trang đăng nhập của Google.
   * @param {Request} _req - Đối tượng request (không được sử dụng trực tiếp).
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Bắt đầu đăng nhập với Google' })
  @ApiResponse({
    status: 302,
    description: 'Chuyển hướng đến trang đăng nhập của Google.',
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() _req: Request) {
    // Guard sẽ tự động chuyển hướng, không cần code trong hàm này.
  }

  /**
   * @route GET /auth/google/callback
   * @description Callback URL cho luồng xác thực Google. `GoogleAuthGuard` xử lý và trả về thông tin người dùng.
   * @param {AuthenticatedUser} user - Thông tin người dùng lấy được từ Google.
   * @param {Response} res - Đối tượng response của Express để gửi script về cho client.
   * @returns {Promise<{ accessToken: string; refreshToken: string }>} - Cặp access token và refresh token.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Callback xử lý sau khi đăng nhập Google thành công',
  })
  @ApiResponse({
    status: 200,
    description:
      'Xác thực thành công. Trả về một script để gửi token cho cửa sổ cha và đóng popup.',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi cấu hình phía server (ví dụ: thiếu FRONTEND_URL).',
  })
  async googleAuthRedirect(
    @User() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginData = await this.authService.login(user);

    const frontendURL = this.configService.get<string>('FRONTEND_URL');
    if (!frontendURL) {
      throw new InternalServerErrorException('Lỗi cấu hình FRONTEND_URL');
    }

    res.cookie('refresh_token', loginData.refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      path: '/',
    });

    const script = `
    <script>
      window.opener.postMessage(${JSON.stringify({
        accessToken: loginData.accessToken,
        user: loginData.user,
      })},'${frontendURL}');
      window.close();
    </script>
    `;

    res.send(script);
  }

  /**
   * @route POST /auth/refresh
   * @description Làm mới access token bằng cách sử dụng refresh token được lưu trong cookie.
   * Luồng hoạt động:
   * 1. Frontend gọi POST /auth/refresh (không cần body).
   * 2. Trình duyệt tự động đính kèm cookie 'refresh_token'.
   * 3. JwtRefreshGuard chặn request, đọc cookie, và xác thực token.
   * 4. Nếu hợp lệ, Guard gắn payload (chứa userId) vào req.user.
   * 5. Controller được thực thi, gọi service để tạo access token mới.
   */
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiCookieAuth('refresh_token') // Mô tả rằng endpoint này yêu cầu cookie 'refresh_token'
  @ApiResponse({ status: 200, description: 'Trả về access token mới.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Refresh token không hợp lệ hoặc đã hết hạn.',
  })
  refreshTokens(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.authService.refreshTokens(userId);
  }

  /**
   * @route POST /auth/logout
   * @description Đăng xuất người dùng. Vô hiệu hóa refresh token trong CSDL và xóa cookie phía client.
   * @param {AuthenticatedRequest} req - Request đã được xác thực bởi `JwtAuthGuard`.
   * @param {Response} res - Đối tượng response của Express để xóa cookie.
   * @returns {Promise<{ message: string }>} - Thông báo đăng xuất thành công.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất người dùng' })
  @ApiCookieAuth() // Cho Swagger biết endpoint này cần xác thực (JWT)
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Access token không hợp lệ.',
  })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub;
    await this.authService.logout(userId);
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Đăng xuất thành công' };
  }
  /**
   * @route POST /auth/forgot-password
   * @description Bắt đầu quá trình quên mật khẩu. Gửi email chứa link đặt lại mật khẩu cho người dùng.
   * @param {ForgotPasswordDto} forgotPasswordDto - DTO chứa email của người dùng.
   * @returns {Promise<{ message: string }>} - Một thông báo chung để bảo mật.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi yêu cầu đặt lại mật khẩu' })
  @ApiResponse({
    status: 200,
    description: 'Luôn trả về thông báo thành công để tránh dò email.',
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  /**
   * @route POST /auth/reset-password
   * @description Đặt lại mật khẩu bằng token đã nhận được qua email.
   * @param {ResetPasswordDto} resetPasswordDto - DTO chứa token và mật khẩu mới.
   * @returns {Promise<{ message: string }>} - Thông báo cập nhật mật khẩu thành công.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu với token' })
  @ApiResponse({
    status: 200,
    description: 'Mật khẩu đã được cập nhật thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc đã hết hạn.',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('login/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'B1 Đăng nhập: Xác thực mật khẩu, gửi mã về email' })
  @ApiBody({ type: LoginUserDto })
  loginInitiate(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginInitiate(
      loginUserDto.email,
      loginUserDto.password,
    );
  }

  @Post('login/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'B2 Đăng nhập: Xác thực mã OTP, nhận tokens' })
  async loginComplete(
    @Body() loginCompleteDto: LoginCompleteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginData = await this.authService.loginComplete(
      loginCompleteDto.email,
      loginCompleteDto.verificationCode,
    );

    // Set cookie và trả về kết quả như logic login cũ
    res.cookie('refresh_token', loginData.refreshToken, {
      /* ... các tùy chọn an toàn ... */
    });
    return {
      accessToken: loginData.accessToken,
      user: loginData.user,
    };
  }
}
