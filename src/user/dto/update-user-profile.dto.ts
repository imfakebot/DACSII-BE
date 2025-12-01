import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  IsIn,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';

/**
 * @class UpdateUserProfileDto
 * @description Data Transfer Object (DTO) để cập nhật thông tin hồ sơ người dùng.
 * Tất cả các trường đều là tùy chọn.
 */
export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'Họ và tên đầy đủ của người dùng.',
    example: 'Nguyễn Văn B',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Họ và tên phải là một chuỗi.' })
  @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự.' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự.' })
  full_name?: string;

  @ApiProperty({
    description: 'Số điện thoại của người dùng (định dạng Việt Nam).',
    example: '0912345678',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ.' })
  phone_number?: string;

  @ApiProperty({
    description: 'Giới tính của người dùng.',
    enum: ['male', 'female', 'other'],
    example: 'male',
    required: false,
  })
  @IsOptional()
  @IsIn(['male', 'female', 'other'], {
    message: 'Giới tính phải là một trong các giá trị: male, female, other.',
  })
  gender?: string;

  @ApiProperty({
    description: 'Ngày sinh của người dùng.',
    example: '2000-01-30',
    required: false,
    format: 'date',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Ngày sinh phải là một ngày hợp lệ (YYYY-MM-DD).' },
  )
  date_of_birth?: Date;

  @ApiProperty({
    description: 'Tiểu sử hoặc mô tả ngắn về bản thân.',
    example: 'Yêu thích lập trình và du lịch.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Tiểu sử không được vượt quá 500 ký tự.' })
  bio?: string;
}
