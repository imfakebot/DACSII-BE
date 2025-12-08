import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { UtilityType } from '../enums/utility-type.enum';

/**
 * @class CreateUtilityDto
 * @description Data Transfer Object (DTO) để tạo một tiện ích hoặc sản phẩm mới.
 */
export class CreateUtilityDto {
  /**
   * Tên của tiện ích/sản phẩm. Phải là duy nhất.
   * @example 'Nước tăng lực Sting'
   */
  @ApiProperty({
    description: 'Tên của tiện ích',
    example: 'Wi-Fi miễn phí',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * URL đến icon đại diện cho tiện ích.
   * @example 'https://example.com/icons/energy-drink.png'
   */
  @ApiPropertyOptional({
    description: 'URL đến icon đại diện cho tiện ích',
    example: 'https://example.com/icons/wifi.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Icon URL phải là một địa chỉ web hợp lệ.' })
  iconUrl?: string;

  /**
   * Giá của sản phẩm. Bắt buộc nếu `type` là 'product'.
   * @example 20000
   */
  @ApiPropertyOptional({
    description: 'Giá của tiện ích (nếu là sản phẩm để bán)',
    example: 20000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  /**
   * Phân loại tiện ích là 'amenity' (tiện nghi) hoặc 'product' (sản phẩm để bán).
   * Mặc định là 'amenity'.
   */
  @ApiPropertyOptional({
    description: 'Loại tiện ích',
    enum: UtilityType,
    default: UtilityType.AMENITY,
  })
  @IsOptional()
  @IsEnum(UtilityType)
  type?: UtilityType;
}
