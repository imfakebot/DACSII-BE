import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../enums/booking-status.enum';

export class FilterBookingDto {
  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Lọc theo trạng thái đơn (Pending, Confirmed, Cancelled...)',
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Trang hiện tại (Mặc định: 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng item mỗi trang (Mặc định: 10)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
