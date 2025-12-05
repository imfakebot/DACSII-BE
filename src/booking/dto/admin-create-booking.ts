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

export class AdminCreateBookingDto {
  @ApiProperty({ description: 'ID của sân bóng', format: 'uuid' })
  @IsNotEmpty()
  @IsString()
  fieldId!: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu (ISO 8601)',
    example: '2025-12-25T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'Thời lượng đá (phút)', example: 90 })
  @IsNotEmpty()
  @IsNumber()
  durationMinutes!: number;

  // Admin có thể nhập SĐT để tìm user, hoặc nhập tên khách vãng lai
  @ApiPropertyOptional({
    description: 'SĐT khách hàng (nếu là thành viên)',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Tên khách hàng (nếu là khách vãng lai)',
    example: 'Anh Tuấn',
  })
  @IsOptional()
  @IsString()
  customerName?: string; // Dùng cho khách vãng lai không có account

  @ApiPropertyOptional({
    description: 'Trạng thái của đơn đặt sân',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.CONFIRMED; // Mặc định là đã xác nhận
}
