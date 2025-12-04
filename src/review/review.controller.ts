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
  Req,
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
import { AuthenticatedRequest } from '@/auth/interface/authenticated-request.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Throttle } from '@nestjs/throttler';

/**
 * @controller ReviewController
 * @description Xử lý các yêu cầu HTTP liên quan đến đánh giá (reviews).
 * Bao gồm các endpoint để tạo, xem và xóa đánh giá.
 */
@ApiTags('Reviews (Đánh giá)')
@Controller('review')
export class ReviewController {
  /**
   * @constructor
   * @param {ReviewService} reviewService - Service xử lý logic nghiệp vụ cho đánh giá.
   * @param {UsersService} userService - Service để truy vấn thông tin người dùng.
   */
  constructor(
    private readonly reviewService: ReviewService,
    private readonly userService: UsersService,
  ) { }

  /**
   * @route POST /review
   * @description (User) Tạo một bài đánh giá mới cho một lượt đặt sân đã hoàn thành.
   * @param {CreateReviewDto} createReviewDto - DTO chứa thông tin bài đánh giá.
   * @param {AuthenticatedRequest} req - Request đã được xác thực, chứa thông tin người dùng.
   * @returns {Promise<Review>} - Bài đánh giá vừa được tạo.
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
    description:
      'Dữ liệu không hợp lệ hoặc không đủ điều kiện đánh giá (VD: đơn chưa hoàn thành, đã đánh giá rồi).',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Người dùng chưa đăng nhập.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt sân hoặc hồ sơ người dùng.',
  })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub;
    const userProfile =
      await this.userService.findProfileByAccountId(accountId);

    if (!userProfile) {
      throw new NotFoundException(
        'Không tìm thấy hồ sơ người dùng. Vui lòng cập nhật thông tin.',
      );
    }

    return this.reviewService.createReview(createReviewDto, userProfile);
  }

  /**
   * @route GET /review/field/:fieldId
   * @description Lấy danh sách các bài đánh giá của một sân bóng cụ thể, có phân trang.
   * @param {string} fieldId - ID của sân bóng.
   * @param {number} page - Số trang (mặc định là 1).
   * @param {number} limit - Số lượng kết quả mỗi trang (mặc định là 10).
   * @returns {Promise<object>} - Danh sách đánh giá và thông tin meta (phân trang, điểm trung bình).
   */
  @Get('field/:fieldId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của một sân bóng' })
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
    description: 'Trả về danh sách đánh giá thành công.',
  })
  async findByField(
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewService.findByField(fieldId, Number(page), Number(limit));
  }

  /**
   * @route DELETE /review/:id
   * @description (Admin) Xóa một bài đánh giá.
   * @param {string} id - ID của bài đánh giá cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xóa thành công.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Xóa một bài đánh giá' })
  @ApiResponse({ status: 200, description: 'Xóa đánh giá thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền Admin.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá để xóa.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.delete(id);
  }
}
