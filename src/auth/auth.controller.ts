import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register/initiate')
    initiateRegistaration(@Body() registerDto: RegisterUserDto) {
        return this.authService.initateRegistration(registerDto);
    }

    @Post('register/complete')
    completeRegistration(@Body() verifyEmailDto: VerifyEmailDto) {
        return this.authService.completeRegistration(verifyEmailDto.email as string, verifyEmailDto.verificationCode as string);
    }
}
