import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackResponse } from './entities/feedback-response.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { Account } from '../user/entities/account.entity';
import { EventGateway } from '@/event/event.gateway';
import { Role } from '@/auth/enums/role.enum';

/**
 * @class FeedbackService
 * @description Service xử lý logic nghiệp vụ cho hệ thống feedback và hỗ trợ.
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  /**
   * @constructor
   * @param {Repository<Feedback>} feedbackRepo - Repository cho thực thể Feedback.
   * @param {Repository<FeedbackResponse>} responseRepo - Repository cho thực thể FeedbackResponse.
   * @param {EventGateway} eventGateway - Gateway để gửi sự kiện real-time qua WebSocket.
   * @param {DataSource} dataSource - Quản lý các transaction của TypeORM.
   */
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepo: Repository<Feedback>,
    @InjectRepository(FeedbackResponse)
    private responseRepo: Repository<FeedbackResponse>,
    private readonly eventGateway: EventGateway,
    private dataSource: DataSource,
  ) { }

  /**
   * @method create
   * @description Tạo một ticket feedback mới cùng với tin nhắn đầu tiên.
   * @param {CreateFeedbackDto} createDto - DTO chứa thông tin để tạo feedback.
   * @param {Account} account - Tài khoản của người dùng tạo feedback.
   * @returns {Promise<Feedback>} - Ticket feedback vừa được tạo.
   */
  async create(
    createDto: CreateFeedbackDto,
    account: Account,
  ): Promise<Feedback> {
    this.logger.log(
      `User ${account.id} creating feedback with DTO: ${JSON.stringify(
        createDto,
      )}`,
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userProfile = account.userProfile;

      // Tạo ticket feedback
      const feedback = queryRunner.manager.create(Feedback, {
        title: createDto.title,
        category: createDto.category,
        status: 'open',
        submitter: userProfile,
      });
      const savedFeedback = await queryRunner.manager.save(feedback);

      // Tạo tin nhắn đầu tiên trong ticket
      const firstResponse = queryRunner.manager.create(FeedbackResponse, {
        content: createDto.content,
        feedback: savedFeedback,
        responder: userProfile,
      });
      await queryRunner.manager.save(firstResponse);

      await queryRunner.commitTransaction();
      this.logger.log(`Feedback ${savedFeedback.id} created successfully`);
      // Thông báo cho admin về ticket mới
      this.eventGateway.notifyAdminsNewFeedback(savedFeedback);
      return savedFeedback;
    } catch (err) {
      this.logger.error(`Error creating feedback: `, err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @method findMyFeedbacks
   * @description Tìm tất cả các ticket feedback do một người dùng cụ thể tạo.
   * @param {Account} account - Tài khoản của người dùng.
   * @returns {Promise<Feedback[]>} - Danh sách các ticket.
   */
  async findMyFeedbacks(account: Account): Promise<Feedback[]> {
    this.logger.log(`Finding feedbacks for user ${account.id}`);
    return this.feedbackRepo.find({
      where: { submitter: { id: account.userProfile.id } },
      order: { created_at: 'DESC' },
      relations: ['responses'],
    });
  }

  /**
   * @method findAll
   * @description (Admin/Manager) Lấy tất cả các ticket feedback trong hệ thống.
   * @returns {Promise<Feedback[]>} - Danh sách tất cả các ticket.
   */
  async findAll(): Promise<Feedback[]> {
    this.logger.log('Finding all feedbacks');
    return this.feedbackRepo.find({
      order: { created_at: 'DESC' },
      relations: ['submitter'], // Load thông tin người gửi
    });
  }

  /**
   * @method findOne
   * @description Tìm chi tiết một ticket feedback, bao gồm tất cả các tin nhắn trả lời.
   * @param {string} id - ID của ticket.
   * @returns {Promise<Feedback>} - Chi tiết của ticket.
   * @throws {NotFoundException} Nếu không tìm thấy ticket.
   */
  async findOne(id: string): Promise<Feedback> {
    this.logger.log(`Finding feedback with id ${id}`);
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: ['responses', 'responses.responder', 'submitter'],
      order: {
        responses: { created_at: 'ASC' },
      },
    });
    if (!feedback) {
      this.logger.error(`Feedback with id ${id} not found`);
      throw new NotFoundException('Không tìm thấy ticket feedback.');
    }
    return feedback;
  }

  /**
   * @method reply
   * @description Gửi một tin nhắn trả lời vào một ticket feedback.
   * Tự động cập nhật trạng thái ticket và gửi sự kiện real-time.
   * @param {string} feedbackId - ID của ticket để trả lời.
   * @param {ReplyFeedbackDto} dto - DTO chứa nội dung trả lời.
   * @param {Account} account - Tài khoản của người gửi trả lời.
   * @returns {Promise<FeedbackResponse>} - Tin nhắn trả lời vừa được lưu.
   */
  async reply(
    feedbackId: string,
    dto: ReplyFeedbackDto,
    account: Account,
  ): Promise<FeedbackResponse> {
    this.logger.log(
      `User ${account.id
      } replying to feedback ${feedbackId} with DTO: ${JSON.stringify(dto)}`,
    );
    const feedback = await this.findOne(feedbackId);
    const userProfile = account.userProfile;
    const roleName = account.role.name;

    // Nếu admin/manager trả lời, cập nhật trạng thái ticket
    if (roleName !== Role.User && feedback.status === 'open') {
      this.logger.log(
        `Updating feedback ${feedbackId} status to in_progress`,
      );
      await this.feedbackRepo.update(feedbackId, { status: 'in_progress' });
    }

    // Tạo và lưu tin nhắn mới
    const response = this.responseRepo.create({
      content: dto.content,
      feedback: { id: feedbackId } as Feedback,
      responder: userProfile,
    });
    const savedResponse = await this.responseRepo.save(response);

    // Gửi sự kiện real-time đến những người đang xem ticket
    this.eventGateway.sendNewMessage(feedbackId, {
      id: savedResponse.id,
      content: savedResponse.content,
      created_at: savedResponse.created_at,
      responder: {
        id: account.userProfile.id,
        fullName: account.userProfile.full_name,
        avatarUrl: account.userProfile.avatar_url,
        role: roleName,
      },
    });

    return savedResponse;
  }
}
