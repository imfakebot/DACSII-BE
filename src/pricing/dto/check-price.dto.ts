import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class CheckPriceDto {
  @ApiProperty({
    description: 'ID của sân bóng muốn đặt',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId!: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu mong muốn (ISO 8601)',
    example: '2025-11-20T17:30:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({
    description: 'Thời lượng đá (tính bằng phút)',
    example: 90,
    minimum: 30,
    maximum: 180,
  })
  @IsInt()
  @Min(30, { message: 'Thời lượng tối thiểu là 30 phút' })
  @Max(300, { message: 'Thời lượng tối đa là 300 phút' })
  durationMinutes!: number;
}
