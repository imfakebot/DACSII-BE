import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  /**
   * URL tùy chọn dùng để làm deep link cho Mobile App.
   * @ApiPropertyOptional - Cung cấp ví dụ và mô tả cho tài liệu Swagger.
   * @IsOptional - Trường này không bắt buộc.
   * @IsString - Đảm bảo giá trị phải là chuỗi.
   */
  @ApiPropertyOptional({
    description: 'URL hoặc Scheme tuỳ chọn để chuyển hướng (Dành cho Mobile App deep link). Ví dụ: dacsii://reset-password',
    example: 'dacsii://reset-password',
  })
  @IsOptional()
  @IsString({ message: 'returnUrl phải là chuỗi hợp lệ.' })
  returnUrl?: string;
}
