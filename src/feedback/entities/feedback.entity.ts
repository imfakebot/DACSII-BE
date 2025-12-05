import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { FeedbackResponse } from './feedback-response.entity';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  category!: string; // VD: 'Complain', 'Suggestion', 'Bug'

  @Column({ default: 'open' })
  status!: string; // 'open', 'in_progress', 'closed'

  @CreateDateColumn()
  created_at!: Date;

  // Người gửi đơn (Khách hàng)
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'submitter_id' })
  submitter!: UserProfile;

  // Người được phân công xử lý (Nhân viên/Admin) - Có thể null
  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: UserProfile;

  // Danh sách các câu trả lời qua lại
  @OneToMany(() => FeedbackResponse, (res) => res.feedback)
  responses!: FeedbackResponse[];
}