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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register/initiate')
  @HttpCode(HttpStatus.OK)
  initiateRegistration(@Body() registerDto: RegisterUserDto) {
    return this.authService.initiateRegistration(registerDto);
  }

  @Post('register/complete')
  @HttpCode(HttpStatus.OK)
  completeRegistration(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.completeRegistration(
      verifyEmailDto.email,
      verifyEmailDto.verificationCode,
    );
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(@User() user: AuthenticatedUser, @Body() _userDto?: LoginUserDto) {
    return this.authService.login(user);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() _req: Request) {
    // Guard sẽ tự động chuyển hướng, không cần code trong hàm này.
  }

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