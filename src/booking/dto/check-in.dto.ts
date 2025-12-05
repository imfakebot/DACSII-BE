import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * @class CheckInDto
 * @description DTO cho yêu cầu check-in một đơn đặt sân.
 */
export class CheckInDto {
  /**
   * ID của đơn đặt sân cần check-in.
   * @example 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
   */
  @ApiProperty({
    description: 'ID của đơn đặt sân cần check-in.',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  bookingId!: string;
}
