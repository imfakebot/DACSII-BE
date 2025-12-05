import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @class ReplyFeedbackDto
 * @description Data Transfer Object để gửi một tin nhắn trả lời trong một ticket feedback.
 */
export class ReplyFeedbackDto {
  @ApiProperty({
    description: 'Nội dung trả lời feedback',
    example: 'Cảm ơn góp ý của bạn, chúng tôi sẽ xem xét.',
  })
  @IsNotEmpty()
  @IsString()
  content!: string;
}
