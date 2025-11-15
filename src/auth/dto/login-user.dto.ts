import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * @class LoginUserDto
 * @description Data Transfer Object (DTO) cho yêu cầu đăng nhập của người dùng.
 * Lớp này định nghĩa cấu trúc và các quy tắc xác thực cho dữ liệu đầu vào khi đăng nhập.
 */
export class LoginUserDto {
  /**
   * Email của người dùng.
   * @IsNotEmpty - Đảm bảo trường này không được để trống.
   * @IsEmail - Đảm bảo giá trị phải là một địa chỉ email hợp lệ.
   * @example "user@example.com"
   */
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  /**
   * Mật khẩu của người dùng.
   * @IsNotEmpty - Đảm bảo trường này không được để trống.
   * @IsString - Đảm bảo giá trị phải là một chuỗi.
   * @MinLength(8) - Đảm bảo mật khẩu có ít nhất 8 ký tự.
   * @example "password123"
   */
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}
