import { ApiProperty } from '@nestjs/swagger';
import { BranchResponseDto } from '@/branch/dto/branch-response.dto';

export class BookingFieldDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: () => BranchResponseDto })
  branch!: BranchResponseDto;
}
