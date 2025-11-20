import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
} from 'class-validator';

/**
 * @class CreateFieldDto
 * @description Data Transfer Object (DTO) để tạo một sân bóng mới.
 * Chứa tất cả các thông tin cần thiết mà client phải cung cấp.
 */
export class CreateFieldDto {
  /**
   * @property {string} name - Tên của sân bóng.
   * @description Bắt buộc, không được để trống.
   */
  @ApiProperty({
    description: 'Tên của sân bóng',
    example: 'Sân bóng mini Cỏ Nhân Tạo',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * @property {string} description - Mô tả chi tiết về sân bóng.
   * @description Không bắt buộc.
   */
  @ApiProperty({ required: false, description: 'Mô tả chi tiết về sân' })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * @property {string} fieldTypeId - ID của loại sân (ví dụ: sân 5 người, sân 7 người).
   * @description Bắt buộc, phải là một UUID hợp lệ.
   */
  @ApiProperty({
    description: 'ID của loại sân (e.g., sân 5, sân 7)',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldTypeId!: string;

  /**
   * @property {string} street - Địa chỉ cụ thể của sân (số nhà, tên đường).
   * @description Bắt buộc, không được để trống.
   */
  @ApiProperty({ description: 'Số nhà, tên đường', example: '123 Võ Văn Ngân' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  /**
   * @property {number} wardId - ID của Phường/Xã nơi sân bóng tọa lạc.
   * @description Bắt buộc, phải là một số.
   */
  @ApiProperty({ description: 'ID của Phường/Xã' })
  @IsNumber()
  @IsNotEmpty()
  wardId!: number;

  /**
   * @property {number} cityId - ID của Tỉnh/Thành phố nơi sân bóng tọa lạc.
   * @description Bắt buộc, phải là một số.
   */
  @ApiProperty({ description: 'ID của Tỉnh/Thành phố' })
  @IsNumber()
  @IsNotEmpty()
  cityId!: number;
}
