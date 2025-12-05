import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { BookingStatus } from '../enums/booking-status.enum';

/**
 * @class AdminCreateBookingDto
 * @description DTO để Admin/Manager/Staff tạo đơn đặt sân trực tiếp (tại quầy).
 * Cho phép tạo đơn cho khách vãng lai hoặc khách đã có tài khoản.
 */
export class AdminCreateBookingDto {
  @ApiProperty({
    description: 'ID của sân bóng cần đặt',
    format: 'uuid',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsNotEmpty()
  @IsString()
  fieldId!: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu đặt sân (định dạng ISO 8601)',
    example: '2025-12-25T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'Thời lượng đá (tính bằng phút)', example: 90 })
  @IsNotEmpty()
  @IsNumber()
  durationMinutes!: number;

  @ApiPropertyOptional({
    description:
      'Số điện thoại của khách hàng. Dùng để tìm và gán đơn cho tài khoản đã tồn tại.',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description:
      'Tên khách hàng. Bắt buộc nếu không cung cấp SĐT, hoặc để ghi đè tên của khách vãng lai.',
    example: 'Anh Tuấn',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái ban đầu của đơn đặt sân (mặc định là COMPLETED)',
    enum: BookingStatus,
    default: BookingStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.COMPLETED;
}
