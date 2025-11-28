import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * @class CreateBookingDto
 * @description Data Transfer Object để tạo một lượt đặt sân mới.
 * Chứa các thông tin cần thiết để người dùng gửi yêu cầu đặt sân.
 */
export class CreateBookingDto {
  /**
   * ID của sân bóng mà người dùng muốn đặt.
   * Phải là một chuỗi UUID hợp lệ.
   * @example 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
   */
  @ApiProperty({
    description: 'ID của sân bóng',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId!: string;

  /**
   * Thời gian bắt đầu đặt sân.
   * Phải là một chuỗi ngày tháng hợp lệ theo định dạng ISO 8601.
   * @example '2025-12-25T14:00:00.000Z'
   */
  @ApiProperty({
    description: 'Thời gian bắt đầu (ISO 8601)',
    example: '2025-12-25T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  /**
   * Thời lượng đặt sân, tính bằng phút.
   * Giá trị phải là số nguyên từ 30 đến 300.
   * @example 90
   */
  @ApiProperty({
    description: 'Thời lượng đá (phút)',
    minimum: 30,
    maximum: 300,
    example: 90,
  })
  @IsInt()
  @Min(30)
  @Max(300)
  durationMinutes!: number;

  /**
   * Mã giảm giá (voucher) người dùng muốn áp dụng.
   * Đây là trường không bắt buộc.
   * @example 'SALE50K'
   */
  @ApiPropertyOptional({
    description: 'Mã giảm giá muốn áp dụng (không bắt buộc)',
    example: 'SALE50K',
  })
  @IsOptional()
  @IsString({ message: 'Mã voucher phải là chuỗi ký tự' })
  voucherCode?: string;
}
