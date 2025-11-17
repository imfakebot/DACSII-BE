/**
 * @class RegisterUserDto
 * @description Data Transfer Object (DTO) cho việc đăng ký người dùng mới.
 * Lớp này định nghĩa cấu trúc dữ liệu và các quy tắc xác thực cho thông tin đầu vào khi người dùng đăng ký.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Email của người dùng',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  email!: string;

  @ApiProperty({
    description: 'Mật khẩu của người dùng, tối thiểu 8 ký tự',
    example: 'password123',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Mật khẩu phải là một chuỗi.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ của người dùng',
    example: 'Nguyễn Văn A',
  })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString({ message: 'Họ và tên phải là một chuỗi.' })
  full_name!: string;

  @ApiProperty({
    description: 'Số điện thoại của người dùng (định dạng Việt Nam)',
    example: '0987654321',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ.' })
  phone_number!: string;

  @ApiProperty({
    description: 'Giới tính của người dùng',
    example: 'male',
    enum: ['male', 'female', 'other'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'], {
    message: 'Gender must be one of male, female, or other',
  })
  gender?: string;
}
