import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * @class LoginCompleteDto
 * @description DTO cho bước 2 của quá trình đăng nhập.
 * Người dùng gửi email và mã OTP đã nhận được để hoàn tất đăng nhập và nhận token.
 */
export class LoginCompleteDto {
  @ApiProperty({
    description: 'Email đã dùng để bắt đầu đăng nhập',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;

  @ApiProperty({
    description: 'Mã OTP gồm 6 ký tự nhận được từ email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực không được để trống.' })
  @Length(6, 6, { message: 'Mã xác thực phải có đúng 6 ký tự.' })
  verificationCode!: string;
}
