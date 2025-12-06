import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UsersService } from '@/user/users.service';
import { AuthenticatedRequest } from '@/auth/interface/authenticated-request.interface';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

/**
 * @controller NotificationController
 * @description Xử lý các yêu cầu HTTP liên quan đến thông báo của người dùng.
 * Tất cả các endpoint trong controller này đều yêu cầu xác thực JWT.
 */
@ApiTags('Notifications (Thông báo)')
@Controller('notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth() // Báo cho Swagger biết các API này cần Bearer Token
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);
  /**
   * @constructor
   * @param {NotificationService} notificationService - Service xử lý logic thông báo.
   * @param {UsersService} usersService - Service để truy vấn thông tin người dùng.
   */
  constructor(
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @route GET /notification
   * @description Lấy danh sách thông báo của người dùng đang đăng nhập, có phân trang.
   * @param {AuthenticatedRequest} req - Request đã được xác thực.
   * @param {number} page - Số trang.
   * @param {number} limit - Số lượng thông báo trên mỗi trang.
   * @returns {Promise<object>} - Danh sách thông báo và thông tin meta (phân trang, số thông báo chưa đọc).
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của tôi' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Số trang',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng mỗi trang',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách thông báo thành công.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ người dùng.' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const accountId = req.user.sub;
    this.logger.log(`Finding all notifications for user ${accountId}`);
    const userProfile =
      await this.usersService.findProfileByAccountId(accountId);
    if (!userProfile) {
      // Sử dụng NotFoundException để trả về mã lỗi 404 chuẩn
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    return await this.notificationService.findAllByUser(
      userProfile.id,
      Number(page),
      Number(limit),
    );
  }

  /**
   * @route PATCH /notification/read-all
   * @description Đánh dấu tất cả thông báo chưa đọc của người dùng thành đã đọc.
   * @param {AuthenticatedRequest} req - Request đã được xác thực.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận.
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  @ApiResponse({ status: 200, description: 'Đánh dấu thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ người dùng.' })
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const accountId = req.user.sub;
    this.logger.log(`Marking all notifications as read for user ${accountId}`);
    const userProfile =
      await this.usersService.findProfileByAccountId(accountId);

    // Thêm kiểm tra để đảm bảo userProfile tồn tại
    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    return this.notificationService.markAllAsRead(userProfile.id);
  }
}
