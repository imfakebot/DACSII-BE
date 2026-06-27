import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FeedbackStatus } from '../enums/feedback-status.enum';

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: FeedbackStatus, description: 'Trạng thái mới của feedback' })
  @IsNotEmpty()
  @IsEnum(FeedbackStatus)
  status!: FeedbackStatus;
}
