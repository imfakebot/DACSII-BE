import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import { FeedbackStatus } from '../enums/feedback-status.enum';
import { FeedbackResponseDto } from './feedback-response.dto';

export class FeedbackDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Góp ý về chất lượng sân' })
  title!: string;

  @ApiProperty({ example: 'suggestion' })
  category!: string;

  @ApiProperty({ enum: FeedbackStatus })
  status!: FeedbackStatus;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty({ type: () => UserProfileResponseDto })
  submitter!: UserProfileResponseDto;

  @ApiProperty({ type: () => UserProfileResponseDto, required: false })
  assignee?: UserProfileResponseDto;

  @ApiProperty({ type: [FeedbackResponseDto] })
  responses!: FeedbackResponseDto[];
}
