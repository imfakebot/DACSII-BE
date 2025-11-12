import { UsersService } from '@/users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';


/**
 * AuthService chịu trách nhiệm xử lý logic liên quan đến xác thực người dùng,
 * bao gồm đăng ký, xác thực email, đăng nhập và tạo token JWT.
 */
@Injectable()
export class AuthService {
    /**
     * @param userService Service để tương tác với dữ liệu người dùng.
     * @param mailerService Service để gửi email.
     * @param jwtService Service để tạo và quản lý JWT.
     */
    constructor(
        private userService: UsersService,
        private readonly mailerService: MailerService,
        private jwtService: JwtService,
    ) { }

    /**
     * Bắt đầu quá trình đăng ký.
     * Tạo một tài khoản chưa được xác thực và gửi mã xác thực qua email.
     * @param registerDto DTO chứa thông tin đăng ký của người dùng.
     * @returns Một thông báo xác nhận đã gửi email.
     * @throws {ConflictException} Nếu email đã được sử dụng hoặc thiếu thông tin.
     */
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
            throw new ConflictException('Invalid verification attempt');
        }

        if (account.verification_code !== code || (account.verification_code_expires_at && account.verification_code_expires_at < new Date())) {
            throw new ConflictException('Invalid or expired verification code');
        }

        await this.userService.verifyAccount(account.id as string);

        return { message: 'Tài khoản của bạn đã được xác thực thành công.' };
    }

    /**
     * Kiểm tra thông tin đăng nhập của người dùng.
     * Phương thức này được gọi tự động bởi LocalStrategy.
     * @param email Email người dùng
     * @param pass Mật khẩu người dùng
     * @returns Thông tin người dùng nếu hợp lệ, ngược lại trả về null.
     */
    async validateUser(email: string, pass: string) {
        const account = await this.userService.findAccountByEmail(email);

        // Chỉ cho phép tài khoản đã xác thực đăng nhập
        if (account && account.is_verified && account.password_hash) {
            const isMatch = await this.userService.comparePassword(pass, account.password_hash);
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
     * Phương thức này được gọi sau khi `validateUser` thành công.
     * @param user Đối tượng người dùng đã được xác thực từ `validateUser`.
     * @returns Một đối tượng chứa access_token.
     */
    login(user: { email: string, user_profile_id: string, role_id: string }) {
        const payload = { email: user.email, sub: user.user_profile_id, role: user.role_id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
