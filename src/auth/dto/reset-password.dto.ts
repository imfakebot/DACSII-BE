import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * @class ResetPasswordDto
 * @description Data Transfer Object (DTO) cho việc đặt lại mật khẩu.
 * Lớp này định nghĩa cấu trúc dữ liệu mà client cần gửi khi họ xác nhận mật khẩu mới bằng token.
 */
export class ResetPasswordDto {
  /**
   * Token đặt lại mật khẩu nhận được từ email.
   * @ApiProperty - Cung cấp ví dụ và mô tả cho tài liệu Swagger.
   * @IsString - Đảm bảo token là một chuỗi.
   * @IsNotEmpty - Đảm bảo token không được để trống.
   */
  @ApiProperty({
    description: 'Token đặt lại mật khẩu nhận được từ email.',
    example:
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  })
  @IsString({ message: 'Token phải là một chuỗi.' })
  @IsNotEmpty({ message: 'Token không được để trống.' })
  token!: string;

  /**
   * Mật khẩu mới mà người dùng muốn đặt.
   * @ApiProperty - Cung cấp ví dụ và mô tả cho tài liệu Swagger.
   * @IsString - Đảm bảo mật khẩu là một chuỗi.
   * @MinLength(8) - Đảm bảo mật khẩu có ít nhất 8 ký tự.
   */
  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 8 ký tự).',
    example: 'newStrongPassword123',
  })
  @IsString({ message: 'Mật khẩu mới phải là một chuỗi.' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
  newPassword!: string;
}
