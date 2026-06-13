import { ApiProperty } from '@nestjs/swagger';
import { BookingDto } from './booking.dto';

export class BookingPaginatedResponseDto {
  @ApiProperty({ type: [BookingDto] })
  data!: BookingDto[];

  @ApiProperty()
  meta!: any; // Will use PaginationMetaDto in manual mapping
}
