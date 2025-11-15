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
import { Request } from 'express';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthenticatedUser, User } from './decorator/users.decorator';
import { LocalAuthGuard } from './guards/local-auth-guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';


/**
 * Interface để định nghĩa cấu trúc của một Request đã được xác thực,
 * đảm bảo `req.user` có kiểu dữ liệu chặt chẽ.
 */
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

/**
 * @controller AuthController
 * @description Xử lý các yêu cầu liên quan đến xác thực người dùng,
 * bao gồm đăng ký, đăng nhập, đăng xuất, xác thực qua Google và làm mới token.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * @route POST /auth/register/initiate
   * @description Bắt đầu quá trình đăng ký. Nhận thông tin người dùng và gửi email xác thực.
   * @param {RegisterUserDto} registerDto - DTO chứa thông tin đăng ký của người dùng.
   * @returns {Promise<{ message: string }>} - Thông báo về việc đã gửi email xác thực.
   */
  @Post('register/initiate')
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
  @HttpCode(HttpStatus.OK)
  completeRegistration(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.completeRegistration(
      verifyEmailDto.email,
      verifyEmailDto.verificationCode,
    );
  }

  /**
   * @route POST /auth/login
   * @description Xác thực và đăng nhập người dùng. Yêu cầu `LocalAuthGuard` để xác thực credentials.
   * @param {AuthenticatedUser} user - Đối tượng người dùng đã được xác thực bởi Guard.
   * @param {LoginUserDto} _userDto - DTO chứa thông tin đăng nhập (chỉ dùng cho validation của Guard).
   * @returns {Promise<{ accessToken: string; refreshToken: string }>} - Cặp access token và refresh token.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(@User() user: AuthenticatedUser, @Body() _userDto?: LoginUserDto) {
    return this.authService.login(user);
  }

  /**
   * @route GET /auth/google
   * @description Bắt đầu luồng xác thực với Google.
   * `GoogleAuthGuard` sẽ tự động chuyển hướng người dùng đến trang đăng nhập của Google.
   * @param {Request} _req - Đối tượng request (không được sử dụng trực tiếp).
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() _req: Request) {
    // Guard sẽ tự động chuyển hướng, không cần code trong hàm này.
  }

  /**
   * @route GET /auth/google/callback
   * @description Callback URL cho luồng xác thực Google. `GoogleAuthGuard` xử lý và trả về thông tin người dùng.
   * @param {AuthenticatedUser} user - Thông tin người dùng lấy được từ Google.
   * @returns {Promise<{ accessToken: string; refreshToken: string }>} - Cặp access token và refresh token.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@User() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const loginData = await this.authService.login(user);

    const frontendURL = this.configService.get<string>('FRONTEND_URL');
    if (!frontendURL) {
      throw new InternalServerErrorException('Lỗi cấu hình FRONTEND_URL')
    }

    res.cookie('refresh_token', loginData.refreshToken, {
      httpOnly: true,// Bắt buộc: Chống XSS
      sameSite: 'strict',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: '/',
    });

    return {
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
    }
  }

  /**
   * Luồng hoạt động:
   * 1. Frontend gọi POST /auth/refresh (không cần body).
   * 2. Trình duyệt tự động đính kèm cookie 'refresh_token'.
   * 3. JwtRefreshGuard chặn request, đọc cookie, và xác thực token.
   * 4. Nếu hợp lệ, Guard gắn payload (chứa userId) vào req.user.
   * 5. Hàm này được thực thi, gọi service để tạo access token mới.
   */
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.authService.refreshTokens(userId);
  }

  /**
   * @route POST /auth/logout
   * Đăng xuất người dùng bằng cách vô hiệu hóa refresh token.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.authService.logout(userId);
  }
}