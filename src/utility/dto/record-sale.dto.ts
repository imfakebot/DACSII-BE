import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * @class RecordSaleDto
 * @description Data Transfer Object (DTO) để ghi nhận một giao dịch bán sản phẩm tại quầy.
 */
export class RecordSaleDto {
  /**
   * ID của tiện ích/sản phẩm được bán.
   */
  @ApiProperty({ description: 'ID của tiện ích/sản phẩm đã bán' })
  @IsNotEmpty()
  @IsInt()
  utilityId!: number;

  /**
   * Số lượng sản phẩm đã bán. Phải là số nguyên dương.
   * @example 2
   */
  @ApiProperty({ description: 'Số lượng đã bán', example: 2 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;

  /**
   * ID của đơn đặt sân liên quan đến giao dịch này (nếu có).
   * Dùng để liên kết việc bán hàng với một trận đấu cụ thể.
   */
  @ApiPropertyOptional({
    description: 'ID của đơn đặt sân liên quan (nếu có)',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
