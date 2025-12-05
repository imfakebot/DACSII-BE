import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackResponse } from './entities/feedback-response.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { Account } from '../user/entities/account.entity';
import { EventGateway } from '@/event/event.gateway';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectRepository(Feedback)
        private feedbackRepo: Repository<Feedback>,
        @InjectRepository(FeedbackResponse)
        private responseRepo: Repository<FeedbackResponse>,
        private readonly eventGateway: EventGateway,
        private dataSource: DataSource,
    ) { }

    // 1. Tạo Feedback
    // Tham số đầu vào là Account (lấy từ req.user)
    async create(createDto: CreateFeedbackDto, account: Account) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Quan trọng: Bảng feedback link với UserProfile, nên phải lấy profile từ account
            const userProfile = account.userProfile;

            // B1: Tạo Ticket
            const feedback = queryRunner.manager.create(Feedback, {
                title: createDto.title,
                category: createDto.category,
                status: 'open',
                submitter: userProfile,
            });
            const savedFeedback = await queryRunner.manager.save(feedback);

            // B2: Tạo tin nhắn đầu tiên
            const firstResponse = queryRunner.manager.create(FeedbackResponse, {
                content: createDto.content,
                feedback: savedFeedback,
                responder: userProfile,
            });
            await queryRunner.manager.save(firstResponse);

            await queryRunner.commitTransaction();
            return savedFeedback;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    // 2. Xem danh sách của tôi
    async findMyFeedbacks(account: Account) {
        return this.feedbackRepo.find({
            // Lọc theo userProfile.id
            where: { submitter: { id: account.userProfile.id } },
            order: { created_at: 'DESC' },
            relations: ['responses'],
        });
    }

    // 3. Admin xem tất cả
    async findAll() {
        return this.feedbackRepo.find({
            order: { created_at: 'DESC' },
            relations: ['submitter'], // Load thông tin người gửi
        });
    }

    // 4. Xem chi tiết
    async findOne(id: string) {
        const feedback = await this.feedbackRepo.findOne({
            where: { id },
            relations: ['responses', 'responses.responder', 'submitter'],
            order: {
                responses: { created_at: 'ASC' }
            }
        });
        if (!feedback) throw new NotFoundException('Feedback not found');
        return feedback;
    }

    // 5. Trả lời (Dùng Account để lấy Profile)
    async reply(feedbackId: string, dto: ReplyFeedbackDto, account: Account) {
        const feedback = await this.findOne(feedbackId);
        const userProfile = account.userProfile;

        // Logic kiểm tra Role nằm trong Account
        // Giả sử account.role là object { name: 'admin' } hoặc string
        // Bạn cần check lại entity Role của bạn
        const roleName = account.role?.name || '';

        // Nếu không phải user thường trả lời -> Đổi trạng thái thành đang xử lý
        if (roleName !== 'user' && feedback.status === 'open') {
            await this.feedbackRepo.update(feedbackId, { status: 'in_progress' });
        }

        const response = this.responseRepo.create({
            content: dto.content,
            feedback: { id: feedbackId } as Feedback,
            responder: userProfile, // 👈 Lưu người trả lời là Profile
        });

        const savedResponse = await this.responseRepo.save(response);

        this.eventGateway.sendNewMessage(feedbackId, {
            id: savedResponse.id,
            content: savedResponse.content,
            createdAt: savedResponse.created_at,
            responder: {
                id: account.userProfile.id,
                fullName: account.userProfile.full_name,
                avatarUrl: account.userProfile.avatar_url,
                // Cần cờ này để Frontend biết tin nhắn này của mình hay của người khác
                role: account.role.name
            }
        });
        return this.responseRepo.save(response);
    }
}