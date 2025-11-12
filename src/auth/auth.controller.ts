import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthGuard } from '@nestjs/passport';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './decorator/users.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register/initiate')
    initiateRegistaration(@Body() registerDto: RegisterUserDto) {
        return this.authService.initateRegistration(registerDto);
    }

    @UseGuards(AuthGuard('local'))
    @Post('login')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    login(@User() user: { email: string, user_profile_id: string, role_id: string }, @Body() userDto: LoginUserDto) {
        return this.authService.login(user);
    }

    @Post('register/complete')
    completeRegistration(@Body() verifyEmailDto: VerifyEmailDto) {
        return this.authService.completeRegistration(verifyEmailDto.email as string, verifyEmailDto.verificationCode as string);
    }
}
