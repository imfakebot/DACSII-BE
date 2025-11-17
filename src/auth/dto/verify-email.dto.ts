import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * @class VerifyEmailDto
 * @description Data Transfer Object (DTO) để xác thực email.
 * Lớp này định nghĩa cấu trúc dữ liệu mà client cần gửi để hoàn tất quá trình đăng ký bằng mã xác thực.
 */
export class VerifyEmailDto {
  /**
   * Mã xác thực gồm 6 ký tự được gửi đến email của người dùng.
   * @ApiProperty - Cung cấp ví dụ và mô tả cho tài liệu Swagger.
   * @IsNotEmpty - Đảm bảo trường này không được để trống.
   * @IsString - Đảm bảo giá trị là một chuỗi.
   * @Length(6, 6) - Đảm bảo mã có đúng 6 ký tự.
   */
  @ApiProperty({
    description: 'Mã xác thực gồm 6 ký tự được gửi qua email.',
    example: 'A1B2C3',
    maxLength: 6,
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Mã xác thực không được để trống.' })
  @IsString({ message: 'Mã xác thực phải là một chuỗi.' })
  @Length(6, 6, { message: 'Mã xác thực phải có đúng 6 ký tự.' })
  verificationCode!: string;

  /**
   * Email của tài khoản cần xác thực.
   * @ApiProperty - Cung cấp ví dụ và mô tả cho tài liệu Swagger.
   * @IsNotEmpty - Đảm bảo trường này không được để trống.
   * @IsEmail - Đảm bảo giá trị là một địa chỉ email hợp lệ.
   */
  @ApiProperty({
    description: 'Email của tài khoản cần xác thực.',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  email!: string;
}
