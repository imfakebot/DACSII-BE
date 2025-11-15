// src/auth/auth.controller.ts (PHIÊN BẢN ĐÃ HOÀN THIỆN)

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthenticatedUser, User } from './decorator/users.decorator';
import { LocalAuthGuard } from './guards/local-auth-guard';
import { GoogleAuthGuard } from './guards/google-auth.guard'; // <-- ĐÃ THÊM

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register/initiate')
  initiateRegistration(@Body() registerDto: RegisterUserDto) {
    return this.authService.initiateRegistration(registerDto);
  }

  @Post('register/complete')
  completeRegistration(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.completeRegistration(
      verifyEmailDto.email,
      verifyEmailDto.verificationCode,
    );
  }

  @UseGuards(LocalAuthGuard)
  @Post('login') // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(@User() user: AuthenticatedUser, @Body() _userDto?: LoginUserDto) {
    return this.authService.login(user);
  }

  // --- PHẦN ĐƯỢC THÊM VÀO ---
  /**
   * @route GET /auth/google
   * Bắt đầu luồng xác thực với Google.
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard) // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() _req: Request) {
    // Guard sẽ tự động chuyển hướng, không cần code trong hàm này
  }

  /**
   * @route GET /auth/google/callback
   * Endpoint mà Google sẽ gọi lại sau khi người dùng xác thực.
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@User() user: AuthenticatedUser) {
    // Guard đã xử lý và trả về user, giờ chỉ cần tạo token
    return this.authService.login(user);
  }
}