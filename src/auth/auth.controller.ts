import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthenticatedUser, User } from './decorator/users.decorator';
import { LocalAuthGuard } from './guards/local-auth-guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Interface để định nghĩa cấu trúc của một Request đã được xác thực,
 * đảm bảo `req.user` có kiểu dữ liệu chặt chẽ.
 */
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
    refreshToken?: string; // Thuộc tính này chỉ tồn tại trong luồng refresh token.
  };
}

/**
 * @ontroller AuthController
 * @description Xử lý các yêu cầu liên quan đến xác thực người dùng,
 * bao gồm đăng ký, đăng nhập, đăng xuất, xác thực qua Google và làm mới token.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

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
  googleAuthRedirect(@User() user: AuthenticatedUser) {
    // Guard đã xử lý và trả về user, giờ chỉ cần tạo token.
    return this.authService.login(user);
  }

  /**
   * @route POST /auth/refresh
   * Sử dụng refresh token để lấy một cặp access/refresh token mới.
   */
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;

    // Dấu '!' (non-null assertion) ở đây là an toàn vì JwtRefreshGuard
    // đảm bảo rằng refreshToken sẽ luôn tồn tại trong request này.
    return this.authService.refreshTokens(userId, refreshToken!);
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