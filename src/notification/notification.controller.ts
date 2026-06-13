import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { NotificationDto } from './dto/notification.dto';
import { NotificationPaginatedResponseDto } from './dto/notification-paginated-response.dto';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

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
   * @param {PaginationQueryDto} query - DTO chứa thông tin phân trang (page, limit).
   * @returns {Promise<NotificationPaginatedResponseDto>} - Danh sách thông báo và thông tin meta (phân trang, số thông báo chưa đọc).
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của tôi' })
  @ApiResponse({
    status: 200,
    type: NotificationPaginatedResponseDto,
    description: 'Trả về danh sách thông báo thành công.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ người dùng.' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationQueryDto,
  ): Promise<NotificationPaginatedResponseDto> {
    const { page, limit } = query;
    const accountId = req.user.sub;
    this.logger.log(`Finding all notifications for user ${accountId}, page ${page}, limit ${limit}`);
    const userProfile =
      await this.usersService.findProfileByAccountId(accountId);
    if (!userProfile) {
      // Sử dụng NotFoundException để trả về mã lỗi 404 chuẩn
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    return await this.notificationService.findAllByUser(
      userProfile.id,
      page,
      limit,
    );
  }

  /**
   * @route PATCH /notification/read-all
   * @description Đánh dấu tất cả thông báo chưa đọc của người dùng thành đã đọc.
   * @param {AuthenticatedRequest} req - Request đã được xác thực.
   * @returns {Promise<MessageResponseDto>} - Thông báo xác nhận.
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  @ApiResponse({ status: 200, type: MessageResponseDto, description: 'Đánh dấu thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ người dùng.' })
  async markAllAsRead(@Req() req: AuthenticatedRequest): Promise<MessageResponseDto> {
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

  /**
   * @route PATCH /notification/:id/read
   * @description Đánh dấu một thông báo cụ thể là đã đọc.
   * @param {AuthenticatedRequest} req - Request đã được xác thực.
   * @param {string} id - ID của thông báo.
   * @returns {Promise<NotificationDto>} - Thông báo đã được cập nhật.
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo là đã đọc' })
  @ApiParam({ name: 'id', description: 'ID của thông báo' })
  @ApiResponse({ status: 200, type: NotificationDto, description: 'Đánh dấu thành công.' })
  @ApiResponse({ status: 404, description: 'Thông báo không tồn tại.' })
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<NotificationDto> {
    const accountId = req.user.sub;
    const userProfile = await this.usersService.findProfileByAccountId(accountId);
    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }
    return this.notificationService.markAsRead(id, userProfile.id);
  }

  /**
   * @route DELETE /notification/clear-all
   * @description Xóa tất cả thông báo của người dùng.
   * @param {AuthenticatedRequest} req - Request đã được xác thực.
   * @returns {Promise<MessageResponseDto>} - Thông báo xác nhận.
   */
  @Delete('clear-all')
  @ApiOperation({ summary: 'Xóa tất cả thông báo' })
  @ApiResponse({ status: 200, type: MessageResponseDto, description: 'Xóa thành công.' })
  async clearAll(@Req() req: AuthenticatedRequest): Promise<MessageResponseDto> {
    const accountId = req.user.sub;
    const userProfile = await this.usersService.findProfileByAccountId(accountId);
    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }
    return this.notificationService.deleteAll(userProfile.id);
  }

  /**
   * @route DELETE /notification/:id
   * @description Xóa một thông báo cụ thể.
   * @param {AuthenticatedRequest} req - Request đã được xác thực.
   * @param {string} id - ID của thông báo cần xóa.
   * @returns {Promise<MessageResponseDto>} - Thông báo xác nhận.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một thông báo' })
  @ApiParam({ name: 'id', description: 'ID của thông báo' })
  @ApiResponse({ status: 200, type: MessageResponseDto, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Thông báo không tồn tại.' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<MessageResponseDto> {
    const accountId = req.user.sub;
    const userProfile = await this.usersService.findProfileByAccountId(accountId);
    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }
    return this.notificationService.delete(id, userProfile.id);
  }
}
