import { UsersService } from '@/users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';


@Injectable()
export class AuthService {
    constructor(private userService: UsersService,
        private readonly mailerService: MailerService
    ) { }
    async initateRegistration(registerDto: RegisterUserDto) {
        const { email, full_name, password, phoneNumber, gender, street, ward_id, city_id } = registerDto;

        if (!email) {
            throw new ConflictException('Email is required');
        }

        if (!password) {
            throw new ConflictException('Password is required');
        }

        if (!full_name) {
            throw new ConflictException('Full name is required');
        }

        const existingAccount = await this.userService.findAccountByEmail(email);
        if (existingAccount && existingAccount.is_verified) {
            throw new ConflictException('Email already in use');
        }

        const verificationCode = randomBytes(3).toString('hex').toUpperCase();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
        const passwordHash = await this.userService.hashPassword(password);

        if (existingAccount) {
            await this.userService.updateUnverifiedAccount(existingAccount.id as string, {
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
                phoneNumber: phoneNumber as string,
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
            text: `Mã xác thực của bạn là: ${verificationCode}. Mã này sẽ hết hạn sau 10 phút.`,
        });

        return { message: 'Mã xác thực đã được gửi đến email của bạn.' };
    }

    async completeRegistration(email: string, code: string) {
        const account = await this.userService.findAccountByEmail(email);
        if (!account || account.is_verified) {
            throw new ConflictException('Invalid verification attempt');
        }

        if (account.verification_code !== code || (account.verification_code_expires_at && account.verification_code_expires_at < new Date())) {
            throw new ConflictException('Invalid or expired verification code');
        }

        await this.userService.verifyAccount(account.id as string);

        return { message: 'Tài khoản của bạn đã được xác thực thành công.' };
    }
}
