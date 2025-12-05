import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interface/authenticated-request.interface';
import { UsersService } from '../user/users.service'; // Check lại đường dẫn này
import { Role } from '@/auth/enums/role.enum';
import { BookingResponse } from './dto/booking-response.dto';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { User } from '@/auth/decorator/users.decorator';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';
import { AdminCreateBookingDto } from './dto/admin-create-booking';

/**
 * @controller BookingsController
 * @description Xử lý các yêu cầu HTTP liên quan đến việc đặt sân của người dùng.
 * Bao gồm các endpoint để tạo, hủy, và xem lịch sử đặt sân.
 */
@ApiTags('Bookings (Đặt sân)')
@Controller('bookings')
export class BookingController {
  /**
   * @constructor
   * @param {BookingService} bookingService - Service xử lý logic nghiệp vụ cho việc đặt sân.
   * @param {UsersService} usersService - Service để truy vấn thông tin người dùng.
   */
  constructor(
    private readonly bookingService: BookingService,
    private readonly usersService: UsersService,
  ) { }

  /**
   * @route POST /bookings
   * @description Tạo một yêu cầu đặt sân mới cho người dùng đã đăng nhập.
   * Quá trình này bao gồm việc kiểm tra tính khả dụng, tính giá, áp dụng voucher và tạo link thanh toán.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } },)
  @ApiOperation({
    summary: 'Tạo yêu cầu đặt sân mới (Kèm xử lý Voucher & VNPay)',
  })
  // Cập nhật lại response type cho đúng với thực tế trả về
  @ApiResponse({
    status: 201,
    description: 'Đặt sân thành công. Trả về link thanh toán VNPay.',
    type: BookingResponse,
  })
  @ApiResponse({
    status: 400,
    description:
      'Lỗi validation (Voucher hết hạn, sai mã...) hoặc dữ liệu không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Người dùng chưa đăng nhập.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hồ sơ người dùng.',
  })
  @ApiResponse({
    status: 409,
    description: 'Sân đã bị người khác đặt trong khung giờ này.',
  })
  /**
   * @param {CreateBookingDto} createBookingDto - DTO chứa thông tin chi tiết về lượt đặt sân.
   * @param {AuthenticatedRequest} req - Đối tượng request đã được xác thực, chứa thông tin người dùng.
   * @returns {Promise<BookingResponse>} - Một đối tượng chứa thông tin đặt sân, URL thanh toán và số tiền cuối cùng.
   * @throws {NotFoundException} Nếu hồ sơ người dùng không tồn tại.
   */
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub;

    // 1. Lấy profile
    const userProfile =
      await this.usersService.findProfileByAccountId(accountId);

    if (!userProfile) {
      throw new NotFoundException(
        'Không tìm thấy hồ sơ người dùng. Vui lòng cập nhật thông tin cá nhân.',
      );
    }

    // 2. Gọi service (Service sẽ return { booking, paymentUrl, finalAmount, message })
    return this.bookingService.createBooking(createBookingDto, userProfile);
  }

  /**
   * @route PATCH /bookings/:id/cancel
   * @description Hủy một yêu cầu đặt sân đã tồn tại.
   */
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '(User/Admin/Manager) Hủy yêu cầu đặt sân & Hoàn Voucher (nếu có)',
  })
  @ApiResponse({ status: 200, description: 'Hủy thành công.' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hủy đơn của người khác.',
  })
  @ApiResponse({ status: 400, description: 'Không thể hủy (Quá hạn giờ hủy).' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn đặt sân.' })
  /**
   * @param {string} bookingId - ID của lượt đặt sân cần hủy.
   * @param {AuthenticatedRequest} req - Đối tượng request đã được xác thực, chứa thông tin và vai trò của người dùng.
   */
  async cancel(
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub;

    const userRole = req.user.role as unknown as Role;

    return this.bookingService.cancelBooking(bookingId, accountId, userRole);
  }

  /**
   * @route GET /bookings/me
   * @description Lấy lịch sử đặt sân của người dùng đang đăng nhập, có hỗ trợ lọc và phân trang.
   * @param {AuthenticatedRequest} req - Đối tượng request đã được xác thực.
   * @param {FilterBookingDto} filterDto - DTO chứa các tham số để lọc và phân trang.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách các đơn đặt sân và thông tin phân trang (meta).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử đặt sân của tôi' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách đơn đặt sân.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyBookings(
    @Req() req: AuthenticatedRequest,
    @Query() filterDto: FilterBookingDto,
  ) {
    return await this.bookingService.getUserBooking(req.user.sub, filterDto);
  }

  /**
  * @route GET /bookings/management/all
  * @description Lấy danh sách booking.
  * - Admin: Xem tất cả.
  * - Manager/Staff: Chỉ xem booking thuộc chi nhánh của mình.
  */
  @Get('management/all') // Đổi tên route cho phù hợp ngữ cảnh quản lý chung
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager, Role.Staff) // <--- Cho phép cả 3 role
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin/Manager/Staff) Lấy danh sách booking' })
  async getAllBooking(
    @Query() filter: FilterBookingDto, // Dùng DTO Filter thay vì liệt kê từng param
    @User() user: AuthenticatedUser,   // <--- Truyền User vào để lấy branch_id
  ) {
    // Gọi hàm getAllBookings (số nhiều) bên Service mà ta đã sửa ở bước trước
    return this.bookingService.getAllBookings(filter, user);
  }

  /**
   * @route POST /bookings/management/create
   * @description Nhân viên/Admin tạo đơn trực tiếp tại quầy (Không cần thanh toán online).
   */
  @Post('management/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager, Role.Staff) // <--- Cho phép nhân viên tạo
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin/Staff) Tạo đơn đặt sân tại quầy' })
  async createBookingByAdmin(
    @Body() dto: AdminCreateBookingDto,
    @User() user: AuthenticatedUser, // <--- Truyền User để check xem có tạo đúng chi nhánh không
  ) {
    return this.bookingService.createBookingByAdmin(dto, user);
  }
}
