import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../enums/booking-status.enum';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import { BranchResponseDto } from '@/branch/dto/branch-response.dto';

export class BookingFieldDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: () => BranchResponseDto })
  branch!: BranchResponseDto;
}

export class BookingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '251206-X8A2' })
  code!: string;

  @ApiProperty({ nullable: true })
  check_in_at!: Date | null;

  @ApiProperty()
  bookingDate!: Date;

  @ApiProperty()
  start_time!: Date;

  @ApiProperty()
  end_time!: Date;

  @ApiProperty({ example: 300000 })
  total_price!: number;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  customerPhone?: string;

  @ApiProperty({ type: () => UserProfileResponseDto, required: false })
  userProfile?: UserProfileResponseDto;

  @ApiProperty({ type: () => BookingFieldDto })
  field!: BookingFieldDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class BookingPaginatedResponseDto {
  @ApiProperty({ type: [BookingDto] })
  data!: BookingDto[];

  @ApiProperty()
  meta!: any; // Will use PaginationMetaDto in manual mapping
}
