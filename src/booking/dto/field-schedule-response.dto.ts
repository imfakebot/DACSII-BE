import { ApiProperty } from '@nestjs/swagger';
import { SlotScheduleDto } from './slot-schedule.dto';

export class FieldScheduleResponseDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  fieldId!: string;

  @ApiProperty({ type: [SlotScheduleDto] })
  bookings!: SlotScheduleDto[];
}
