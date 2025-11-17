import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * @class ForgotPasswordDto
 * @description Data Transfer Object (DTO) cho yêu cầu quên mật khẩu.
 * Lớp này định nghĩa cấu trúc dữ liệu mà client cần gửi khi họ muốn bắt đầu quá trình đặt lại mật khẩu.
 */
export class ForgotPasswordDto {
  /**
   * Email của tài khoản cần đặt lại mật khẩu.
   * @ApiProperty - Cung cấp ví dụ và mô tả cho tài liệu Swagger.
   * @IsEmail - Đảm bảo giá trị phải là một địa chỉ email hợp lệ.
   * @IsNotEmpty - Đảm bảo trường này không được để trống.
   */
  @ApiProperty({
    description: 'Email của tài khoản cần đặt lại mật khẩu.',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email!: string;
}
