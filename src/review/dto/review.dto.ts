import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import { PaginationMetaDto } from '@/common/dto/pagination-meta.dto';

export class ReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: () => UserProfileResponseDto })
  userProfile!: UserProfileResponseDto;
}

export class ReviewPaginatedResponseDto {
  @ApiProperty({ type: [ReviewDto] })
  data!: ReviewDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
