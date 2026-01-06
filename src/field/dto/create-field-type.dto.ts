import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFieldTypeDto {
  @ApiProperty({ example: 'Sân 5', description: 'Tên loại sân' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Sân bóng đá mini 5 người', description: 'Mô tả loại sân', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}