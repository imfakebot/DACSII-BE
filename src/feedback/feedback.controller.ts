import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { User } from '@/auth/decorator/users.decorator';
import { Account } from '@/user/entities/account.entity';
import { Role } from '@/auth/enums/role.enum';

import { FeedbackDto, FeedbackResponseDto } from './dto/feedback.dto';

/**
 * @controller FeedbackController
 * @description Xử lý các yêu cầu HTTP liên quan đến hệ thống feedback và hỗ trợ khách hàng.
 * Yêu cầu xác thực JWT cho tất cả các endpoint.
 */
@ApiTags('Feedbacks (Hỗ trợ & Góp ý)')
@ApiBearerAuth()
@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);
  /**
   * @constructor
   * @param {FeedbackService} feedbacksService - Service xử lý logic nghiệp vụ cho feedback.
   */
  constructor(private readonly feedbacksService: FeedbackService) {}

  /**
   * @route POST /feedbacks
   * @description (User) Tạo một ticket feedback/hỗ trợ mới.
   * @param {CreateFeedbackDto} createDto - DTO chứa thông tin để tạo feedback.
   * @param {Account} account - Thông tin tài khoản của người dùng đang đăng nhập.
   * @returns {Promise<FeedbackDto>} - Ticket feedback vừa được tạo.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '(User) Tạo một ticket feedback/hỗ trợ mới' })
  @ApiResponse({ status: 201, type: FeedbackDto, description: 'Tạo ticket thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createDto: CreateFeedbackDto, @User() account: Account): Promise<FeedbackDto> {
    this.logger.log(
      `User ${account.id} creating feedback with DTO: ${JSON.stringify(
        createDto,
      )}`,
    );
    return this.feedbacksService.create(createDto, account);
  }

  /**
   * @route GET /feedbacks/me
   * @description (User) Lấy danh sách các ticket feedback do chính người dùng tạo.
   * @param {Account} account - Thông tin tài khoản của người dùng đang đăng nhập.
   * @returns {Promise<FeedbackDto[]>} - Danh sách các ticket của người dùng.
   */
  @Get('me')
  @ApiOperation({ summary: '(User) Xem danh sách các ticket của tôi' })
  @ApiResponse({
    status: 200,
    type: [FeedbackDto],
    description: 'Trả về danh sách các ticket của người dùng.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findMine(@User() account: Account): Promise<FeedbackDto[]> {
    this.logger.log(`Fetching feedbacks for user ${account.id}`);
    return this.feedbacksService.findMyFeedbacks(account);
  }

  /**
   * @route GET /feedbacks/admin/all
   * @description (Admin/Manager) Lấy danh sách tất cả các ticket trong hệ thống.
   * @returns {Promise<FeedbackDto[]>} - Danh sách tất cả các ticket.
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: '(Admin/Manager) Xem tất cả các ticket' })
  @ApiResponse({ status: 200, type: [FeedbackDto], description: 'Trả về tất cả các ticket.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(): Promise<FeedbackDto[]> {
    this.logger.log('Fetching all feedbacks');
    return this.feedbacksService.findAll();
  }

  /**
   * @route GET /feedbacks/:id
   * @description Xem chi tiết một ticket feedback, bao gồm tất cả các tin nhắn trả lời.
   * @param {string} id - ID của ticket feedback.
   * @returns {Promise<FeedbackDto>} - Chi tiết của ticket.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một cuộc hội thoại trong ticket' })
  @ApiResponse({ status: 200, type: FeedbackDto, description: 'Trả về chi tiết ticket.' })
  @ApiResponse({ status: 404, description: 'Ticket not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FeedbackDto> {
    this.logger.log(`Fetching feedback with id ${id}`);
    return this.feedbacksService.findOne(id);
  }

  /**
   * @route POST /feedbacks/:id/reply
   * @description Gửi một tin nhắn trả lời trong một cuộc hội thoại của ticket.
   * Có thể được sử dụng bởi cả người dùng và admin/manager.
   * @param {string} id - ID của ticket feedback.
   * @param {ReplyFeedbackDto} dto - DTO chứa nội dung tin nhắn trả lời.
   * @param {Account} account - Thông tin tài khoản của người gửi tin nhắn.
   * @returns {Promise<FeedbackResponseDto>} - Tin nhắn trả lời vừa được tạo.
   */
  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn trả lời trong một ticket' })
  @ApiResponse({ status: 201, type: FeedbackResponseDto, description: 'Gửi trả lời thành công.' })
  @ApiResponse({ status: 404, description: 'Ticket not found.' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyFeedbackDto,
    @User() account: Account, // 👈 Lấy account trực tiếp
  ): Promise<FeedbackResponseDto> {
    this.logger.log(
      `User ${account.id} replying to feedback ${id} with DTO: ${JSON.stringify(
        dto,
      )}`,
    );
    return this.feedbacksService.reply(id, dto, account);
  }
}
