import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID của sân bóng' })
  @IsUUID()
  @IsNotEmpty()
  fieldId!: string;

  @ApiProperty({ description: 'Thời gian bắt đầu (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ description: 'Thời lượng đá (phút)', minimum: 30 })
  @IsInt()
  @Min(30)
  @Max(300)
  durationMinutes!: number;
}
