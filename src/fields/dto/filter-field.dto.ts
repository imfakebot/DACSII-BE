import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';

export class FilterFieldDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên sân' })
  @IsOptional()
  @IsString()
  name?: string;

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
  radius?: number = 10; // Mặc định tìm trong 10km

  @ApiPropertyOptional({ description: 'Lọc theo thành phố' })
  @IsOptional()
  @IsNumber()
  cityId?: number;

  @ApiPropertyOptional({ description: 'Lọc theo loại sân' })
  @IsOptional()
  @IsUUID()
  fieldTypeId?: string;
}
