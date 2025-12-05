import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { UsersService } from '@/user/users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Throttle } from '@nestjs/throttler';
import { User } from '@/auth/decorator/users.decorator'; // Import decorator User
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface'; // Import interface

/**
 * @controller ReviewController
 * @description Xử lý các yêu cầu HTTP liên quan đến đánh giá (reviews).
 */
@ApiTags('Reviews (Đánh giá)')
@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly userService: UsersService,
  ) {}

  /**
   * @route POST /review
   * @description (User) Tạo một bài đánh giá mới.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: '(User) Tạo một bài đánh giá mới' })
  @ApiResponse({ status: 201, description: 'Tạo đánh giá thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc đã đánh giá trước đó.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt sân hoặc hồ sơ người dùng.',
  })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @User() user: AuthenticatedUser,
  ) {
    const accountId = user.id;
    const userProfile =
      await this.userService.findProfileByAccountId(accountId);

    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    return this.reviewService.createReview(createReviewDto, userProfile);
  }

  /**
   * @route GET /review/field/:fieldId
   * @description Lấy danh sách đánh giá của một sân (Public).
   */
  @Get('field/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của một sân bóng' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Trả về danh sách đánh giá.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  async findByField(
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewService.findByField(fieldId, Number(page), Number(limit));
  }

  // ==================== PHẦN BỔ SUNG MỚI ====================

  /**
   * @route GET /review/management/all
   * @description Lấy danh sách đánh giá (Dành cho quản lý).
   * - Admin: Xem tất cả.
   * - Manager: Chỉ xem đánh giá của chi nhánh mình.
   */
  @Get('management/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager) // Cho phép cả Admin và Manager
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin/Manager) Quản lý danh sách đánh giá' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Trả về danh sách đánh giá.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async getAllReviews(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @User() user: AuthenticatedUser, // Lấy thông tin user để lọc theo branch
  ) {
    return this.reviewService.findAllReviews(Number(page), Number(limit), user);
  }

  /**
   * @route DELETE /review/:id
   * @description Xóa một bài đánh giá.
   * - Admin: Xóa bất kỳ.
   * - Manager: Xóa đánh giá thuộc chi nhánh mình.
   * - User: Xóa đánh giá của chính mình.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager, Role.User) // Mở rộng quyền xóa
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa một bài đánh giá' })
  @ApiResponse({ status: 200, description: 'Xóa đánh giá thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthenticatedUser, // Truyền user xuống service để check quyền
  ) {
    return this.reviewService.delete(id, user);
  }
}
