import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @class CheckInDto
 * @description DTO cho yêu cầu check-in một đơn đặt sân.
 */
export class CheckInDto {
  /**
   * Mã đặt sân (VD: 241216-ABCD) hoặc ID (UUID) của đơn đặt sân cần check-in.
   * @example '241216-ABCD'
   */
  @ApiProperty({
    description: 'Mã đặt sân (VD: 241216-ABCD) hoặc ID (UUID) của đơn đặt sân cần check-in.',
    example: '241216-ABCD',
  })
  @IsNotEmpty()
  @IsString()
  identifier!: string;
}
