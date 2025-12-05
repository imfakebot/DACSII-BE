import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';
import sanitizeHtml from 'sanitize-html';

export class FilterFieldDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên sân (VD: Sân 5)' })
  @IsOptional()
  @IsString()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @Transform(({ value }) => sanitizeHtml(value))
  name?: string;

  @ApiPropertyOptional({ description: 'Lọc theo Chi nhánh cụ thể' })
  @IsOptional()
  @IsUUID()
  branchId?: string; // 👈 THÊM MỚI

  @ApiPropertyOptional({ description: 'Vĩ độ của người dùng (User Latitude)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ của người dùng (User Longitude)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Bán kính tìm kiếm (km)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number = 10;

  @ApiPropertyOptional({ description: 'Lọc theo thành phố (của Chi nhánh)' })
  @IsOptional()
  @Type(() => Number) // Quan trọng: Query param luôn là string, cần ép kiểu về number
  @IsNumber()
  cityId?: number;

  @ApiPropertyOptional({ description: 'Lọc theo loại sân' })
  @IsOptional()
  @IsUUID()
  fieldTypeId?: string;
}
