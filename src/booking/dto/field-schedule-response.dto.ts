import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../enums/booking-status.enum';

export class SlotScheduleDto {
  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;
}

export class FieldScheduleResponseDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  fieldId!: string;

  @ApiProperty({ type: [SlotScheduleDto] })
  bookings!: SlotScheduleDto[];
}
