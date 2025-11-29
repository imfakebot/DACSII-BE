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
  @IsNotEmpty()
  @IsString()
  fieldId!: string;

  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @IsNotEmpty()
  @IsNumber()
  durationMinutes!: number;

  // Admin có thể nhập SĐT để tìm user, hoặc nhập tên khách vãng lai
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerName?: string; // Dùng cho khách vãng lai không có account

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.CONFIRMED; // Mặc định là đã xác nhận
}
