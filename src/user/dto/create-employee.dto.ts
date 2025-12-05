// dto/create-employee.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender } from '../enum/gender.enum';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Email của nhân viên',
    example: 'staff@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Mật khẩu của nhân viên (tối thiểu 6 ký tự)',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ description: 'Họ và tên đầy đủ', example: 'Lê Thị B' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Giới tính',
    enum: Gender,
    example: 'female',
  })
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Tiểu sử ngắn', required: false })
  @IsOptional()
  bio?: string;

  // Chỉ bắt buộc nếu người tạo là Admin (để chỉ định chi nhánh cho Manager)
  @ApiPropertyOptional({
    description:
      'ID của chi nhánh (Bắt buộc khi Admin tạo Manager, tự động lấy khi Manager tạo Staff)',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  branchId?: string;
}
