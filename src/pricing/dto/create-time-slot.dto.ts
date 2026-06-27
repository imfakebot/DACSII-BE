import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateTimeSlotDto {
  @ApiProperty({ description: 'ID của sân bóng', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  field_id!: string;

  @ApiProperty({ description: 'Thời gian bắt đầu', example: '05:00:00' })
  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @ApiProperty({ description: 'Thời gian kết thúc', example: '07:00:00' })
  @IsString()
  @IsNotEmpty()
  end_time!: string;

  @ApiProperty({ description: 'Giá tiền', example: 250000 })
  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @ApiProperty({ description: 'Là giờ cao điểm?', example: false })
  @IsBoolean()
  @IsNotEmpty()
  is_peak_hour!: boolean;
}
