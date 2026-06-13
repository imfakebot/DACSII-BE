import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';

export class FeedbackResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Cảm ơn bạn đã góp ý.' })
  content!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty({ type: () => UserProfileResponseDto })
  responder!: UserProfileResponseDto;
}
