import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsUUID,
} from 'class-validator';

/**
 * @class CreateVoucherDto
 * @description Data Transfer Object để tạo một mã giảm giá mới.
 * Chứa các thông tin cần thiết và các quy tắc validation cho một voucher.
 */
export class CreateVoucherDto {
  /**
   * Mã của voucher (ví dụ: 'SALE50K', 'FREESHIP').
   * Bắt buộc và phải là chuỗi.
   * @example 'SUMMER2024'
   */
  @ApiProperty({
    description: "Mã của voucher (ví dụ: 'SALE50K', 'FREESHIP')",
    example: 'SUMMER2024',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  /**
   * Số tiền giảm giá cố định (ví dụ: 50000).
   * Nếu có, `discountPercentage` nên để trống.
   * @example 50000
   */
  @ApiPropertyOptional({
    description:
      'Số tiền giảm giá cố định (ví dụ: 50000). Nếu có, `discountPercentage` nên để trống.',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  /**
   * Tỷ lệ phần trăm giảm giá (ví dụ: 10 cho 10%).
   * Nếu có, `discountAmount` nên để trống.
   * @example 10
   */
  @ApiPropertyOptional({
    description:
      'Tỷ lệ phần trăm giảm giá (ví dụ: 10 cho 10%). Nếu có, `discountAmount` nên để trống.',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  discountPercentage?: number;

  /**
   * Số tiền giảm giá tối đa có thể nhận được khi áp dụng voucher theo phần trăm.
   * Chỉ áp dụng khi `discountPercentage` được sử dụng.
   * @example 100000
   */
  @ApiPropertyOptional({
    description:
      'Số tiền giảm giá tối đa có thể nhận được khi áp dụng voucher theo phần trăm.',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  /**
   * Giá trị đơn hàng tối thiểu để có thể áp dụng voucher.
   * @example 500000
   */
  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu để có thể áp dụng voucher.',
    example: 500000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  /**
   * Ngày bắt đầu hiệu lực của voucher.
   * Phải là một chuỗi ngày tháng hợp lệ (ISO 8601).
   * @example '2025-12-01T00:00:00.000Z'
   */
  @ApiProperty({
    description: 'Ngày bắt đầu hiệu lực của voucher (ISO 8601).',
    example: '2025-12-01T00:00:00.000Z',
  })
  @IsDateString()
  validFrom!: string;

  /**
   * Ngày kết thúc hiệu lực của voucher.
   * Phải là một chuỗi ngày tháng hợp lệ (ISO 8601).
   * @example '2025-12-31T23:59:59.000Z'
   */
  @ApiProperty({
    description: 'Ngày kết thúc hiệu lực của voucher (ISO 8601).',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsDateString()
  validTo!: string;

  /**
   * Tổng số lượng voucher có thể sử dụng.
   * Phải là số nguyên lớn hơn 0.
   * @example 100
   */
  @ApiProperty({
    description: 'Tổng số lượng voucher có thể sử dụng.',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  quantity!: number;

  /**
   * ID của người dùng được chỉ định voucher.
   * Nếu để trống, voucher sẽ là public.
   */
  @ApiPropertyOptional({
    description:
      'ID của người dùng được chỉ định voucher. Nếu để trống, voucher sẽ là public.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userProfileId?: string;
}
