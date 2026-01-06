import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateTimeSlotDto {
  @ApiProperty({
    description: 'Giá tiền cho khung giờ này',
    example: 300000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Thời gian bắt đầu',
    example: '05:00:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  start_time?: string;

  @ApiProperty({
    description: 'Thời gian kết thúc',
    example: '07:00:00',
    required: false,
  })
  @IsString()
  @IsOptional()
  end_time?: string;

  @ApiProperty({
    description: 'Là khung giờ cao điểm?',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_peak_hour?: boolean;
}
