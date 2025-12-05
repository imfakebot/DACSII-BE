import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Feedback } from './feedback.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class FeedbackResponse
 * @description Đại diện cho một tin nhắn trả lời trong một ticket feedback.
 */
@Entity('feedback_responses')
export class FeedbackResponse {
  /**
   * ID duy nhất của tin nhắn trả lời.
   */
  @ApiProperty({
    description: 'ID duy nhất của tin nhắn',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Nội dung chi tiết của tin nhắn.
   */
  @ApiProperty({
    description: 'Nội dung chi tiết của tin nhắn',
    example: 'Cảm ơn bạn đã góp ý, chúng tôi sẽ cải thiện dịch vụ.',
  })
  @Column({ type: 'text' })
  content!: string;

  /**
   * Thời điểm tin nhắn được tạo.
   */
  @ApiProperty({ description: 'Thời điểm tạo tin nhắn' })
  @CreateDateColumn()
  created_at!: Date;

  /**
   * Mối quan hệ N-1 tới Feedback. Mỗi tin nhắn thuộc về một ticket.
   */
  @ApiProperty({ type: () => Feedback })
  @ManyToOne(() => Feedback, (feedback) => feedback.responses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'feedback_id' })
  feedback!: Feedback;

  /**
   * Mối quan hệ N-1 tới UserProfile. Ai là người gửi tin nhắn này.
   */
  @ApiProperty({ type: () => UserProfile })
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'responder_id' })
  responder!: UserProfile;
}
