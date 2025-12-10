import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { FeedbackResponse } from './feedback-response.entity';
import { ApiProperty } from '@nestjs/swagger';
import { FeedbackStatus } from '../enums/feedback-status.enum';
/**
 * @class Feedback
 * @description Đại diện cho một "ticket" feedback, một cuộc hội thoại giữa người dùng và quản trị viên.
 */
@Entity('feedbacks')
export class Feedback {
  /**
   * ID duy nhất của ticket feedback.
   */
  @ApiProperty({
    description: 'ID duy nhất của ticket',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Tiêu đề của ticket.
   */
  @ApiProperty({
    description: 'Tiêu đề của ticket',
    example: 'Góp ý về chất lượng sân',
  })
  @Column()
  title!: string;

  /**
   * Danh mục của feedback, ví dụ: 'Góp ý', 'Khiếu nại', 'Báo lỗi'.
   */
  @ApiProperty({
    description:
      "Danh mục của feedback, ví dụ: 'Góp ý', 'Khiếu nại', 'Báo lỗi'",
    example: 'suggestion',
  })
  @Column()
  category!: string;

  /**
   * Trạng thái của ticket: 'open', 'in_progress', 'closed'.
   */
  @ApiProperty({
    description: 'Trạng thái của ticket',
    enum: FeedbackStatus,
    example: FeedbackStatus.OPEN,
  })
  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.OPEN,
  })
  status!: FeedbackStatus;

  /**
   * Thời điểm ticket được tạo.
   */
  @ApiProperty({ description: 'Thời điểm tạo' })
  @CreateDateColumn()
  created_at!: Date;

  /**
   * Người dùng đã gửi ticket này.
   */
  @ApiProperty({ type: () => UserProfile })
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'submitter_id' })
  submitter!: UserProfile;

  /**
   * Nhân viên hoặc quản trị viên được giao xử lý ticket này (có thể null).
   */
  @ApiProperty({ type: () => UserProfile, required: false })
  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: UserProfile;

  /**
   * Danh sách tất cả các tin nhắn trả lời trong ticket này.
   */
  @ApiProperty({ type: () => [FeedbackResponse] })
  @OneToMany(() => FeedbackResponse, (res) => res.feedback)
  responses!: FeedbackResponse[];
}
