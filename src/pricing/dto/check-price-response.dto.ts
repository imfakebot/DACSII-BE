import { ApiProperty } from '@nestjs/swagger';
import { BookingDetailsDto } from './booking-detail.dto';
import { PricingDetailsDto } from './pricing-detail.dto';

export class CheckPriceResponseDto {
  @ApiProperty({ example: true, description: 'Sân có trống hay không' })
  available!: boolean;

  @ApiProperty({ example: 'Sân 5 người - Số 1', description: 'Tên sân bóng' })
  field_name!: string;

  @ApiProperty({ description: 'Chi tiết về thời gian đặt' })
  booking_details!: BookingDetailsDto;

  @ApiProperty({ description: 'Chi tiết về giá tiền' })
  pricing!: PricingDetailsDto;

  @ApiProperty({
    example: 'Sân còn trống, có thể đặt ngay.',
    description: 'Thông báo từ hệ thống',
  })
  message!: string;
}
