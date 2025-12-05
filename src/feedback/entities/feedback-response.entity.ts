import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Feedback } from './feedback.entity';

@Entity('feedback_responses')
export class FeedbackResponse {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    content!: string;

    @CreateDateColumn()
    created_at!: Date;

    // Thuộc về Ticket nào
    @ManyToOne(() => Feedback, (feedback) => feedback.responses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'feedback_id' })
    feedback!: Feedback;

    // Ai là người trả lời câu này (Khách hay Admin?)
    @ManyToOne(() => UserProfile)
    @JoinColumn({ name: 'responder_id' })
    responder!: UserProfile;
}