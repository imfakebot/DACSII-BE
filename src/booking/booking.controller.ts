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
  Logger,
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
import { UsersService } from '../user/users.service';
import { Role } from '@/auth/enums/role.enum';
import { BookingResponse } from './dto/booking-response.dto';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { User } from '@/auth/decorator/users.decorator';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';
import { AdminCreateBookingDto } from './dto/admin-create-booking';
import { CheckInDto } from './dto/check-in.dto';
import { Booking } from './entities/booking.entity';


/**
 * @controller BookingController
 * @description Xử lý các yêu cầu HTTP liên quan đến việc đặt sân.
 * Bao gồm các endpoint để người dùng tạo, hủy, xem lịch sử đặt sân,
 * và các endpoint quản trị cho nhân viên, quản lý.
 */
@ApiTags('Bookings (Đặt sân)')
@Controller('bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);
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
   * @description (User) Tạo một yêu cầu đặt sân mới.
   * Người dùng đã đăng nhập có thể tạo một đơn đặt sân. Hệ thống sẽ kiểm tra tính khả dụng,
   * tính giá, áp dụng voucher (nếu có) và trả về URL thanh toán VNPAY.
   * @param {CreateBookingDto} createBookingDto - DTO chứa thông tin chi tiết về lượt đặt sân.
   * @param {AuthenticatedRequest} req - Đối tượng request đã được xác thực, chứa thông tin người dùng.
   * @returns {Promise<BookingResponse>} - Một đối tượng chứa thông tin đặt sân, URL thanh toán và số tiền cuối cùng.
   * @throws {NotFoundException} Nếu hồ sơ người dùng không tồn tại.
   * @throws {ConflictException} Nếu sân đã bị người khác đặt trong khung giờ này.
   * @throws {BadRequestException} Nếu voucher không hợp lệ.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '(User) Tạo yêu cầu đặt sân mới (Kèm xử lý Voucher & VNPay)',
  })
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
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub;
    this.logger.log(
      `User ${accountId} creating booking for field ${createBookingDto.fieldId}`,
    );

    // 1. Xử lý IP Address (Fix lỗi VNPAY)
    // Nếu app chạy sau Nginx/Cloudflare, IP nằm trong header 'x-forwarded-for'
    const forwarded = req.headers['x-forwarded-for'];
    let ip = forwarded
      ? (typeof forwarded === 'string' ? forwarded : forwarded[0])
      : req.socket.remoteAddress;

    // Xử lý trường hợp IP có nhiều lớp (ví dụ: client, proxy1, proxy2) -> lấy cái đầu
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Nếu không lấy được hoặc là IPv6 loopback (::1), gán mặc định localhost IPv4
    const clientIp = (ip && ip !== '::1') ? ip : '127.0.0.1';

    const userProfile =
      await this.usersService.findProfileByAccountId(accountId);

    if (!userProfile) {
      this.logger.warn(`User profile not found for account ${accountId}`);
      throw new NotFoundException(
        'Không tìm thấy hồ sơ người dùng. Vui lòng cập nhật thông tin cá nhân.',
      );
    }

    return this.bookingService.createBooking(createBookingDto, userProfile, clientIp);
  }

  /**
   * @route PATCH /bookings/:id/cancel
   * @description Hủy một yêu cầu đặt sân đã tồn tại.
   * - User: có thể hủy đơn của chính mình.
   * - Admin/Manager: có thể hủy đơn bất kỳ (thường là trong chi nhánh của họ).
   * @param {string} bookingId - ID của lượt đặt sân cần hủy.
   * @param {AuthenticatedRequest} req - Đối tượng request đã được xác thực, chứa thông tin và vai trò của người dùng.
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
  async cancel(
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub;
    const userRole = req.user.role as unknown as Role;
    this.logger.log(
      `User ${accountId} (Role: ${userRole}) attempting to cancel booking ${bookingId}`,
    );
    return this.bookingService.cancelBooking(bookingId, accountId, userRole);
  }

  /**
   * @route GET /bookings/me
   * @description (User) Lấy lịch sử đặt sân của người dùng đang đăng nhập.
   * Hỗ trợ lọc và phân trang.
   * @param {AuthenticatedRequest} req - Đối tượng request đã được xác thực.
   * @param {FilterBookingDto} filterDto - DTO chứa các tham số để lọc và phân trang.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách các đơn đặt sân và thông tin phân trang (meta).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(User) Xem lịch sử đặt sân của tôi' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách đơn đặt sân.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyBookings(
    @Req() req: AuthenticatedRequest,
    @Query() filterDto: FilterBookingDto,
  ) {
    this.logger.log(`Fetching bookings for user ${req.user.sub}`);
    return await this.bookingService.getUserBooking(req.user.sub, filterDto);
  }

  /**
   * @route GET /bookings/management/all
   * @description Lấy danh sách booking cho mục đích quản lý.
   * - Admin: Xem tất cả.
   * - Manager/Staff: Chỉ xem các booking thuộc chi nhánh của mình.
   * @param {FilterBookingDto} filter - DTO chứa các tham số lọc và phân trang.
   * @param {AuthenticatedUser} user - Người dùng đang thực hiện yêu cầu (để lấy branch_id).
   * @returns {Promise<object>} - Danh sách đơn đặt sân và thông tin phân trang.
   */
  @Get('management/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager, Role.Staff)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin/Manager/Staff) Lấy danh sách booking' })
  async getAllBooking(
    @Query() filter: FilterBookingDto,
    @User() user: AuthenticatedUser,
  ) {
    this.logger.log(
      `User ${user.id} fetching all bookings with filter: ${JSON.stringify(
        filter,
      )}`,
    );
    return this.bookingService.getAllBookings(filter, user);
  }

  /**
   * @route POST /bookings/management/create
   * @description (Admin/Staff/Manager) Tạo đơn trực tiếp tại quầy.
   * Đơn được tạo với phương thức thanh toán là `CASH` và trạng thái `COMPLETED`.
   * @param {AdminCreateBookingDto} dto - DTO chứa thông tin đơn đặt sân.
   * @param {AuthenticatedUser} user - Người dùng (nhân viên) đang tạo đơn.
   * @returns {Promise<Booking>} - Đơn đặt sân vừa được tạo.
   */
  @Post('management/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager, Role.Staff)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin/Staff/Manager) Tạo đơn đặt sân tại quầy' })
  async createBookingByAdmin(
    @Body() dto: AdminCreateBookingDto,
    @User() user: AuthenticatedUser,
  ) {
    this.logger.log(
      `User ${user.id} creating booking at counter: ${JSON.stringify(dto)}`,
    );
    return this.bookingService.createBookingByAdmin(dto, user);
  }

  /**
   * @route POST /bookings/check-in
   * @description (Manager/Admin) Check-in cho khách hàng khi đến sân.
   * Cập nhật trạng thái của đơn đặt sân từ `COMPLETED` thành `CHECKED_IN`.
   * @param {CheckInDto} checkInDto - DTO chứa ID của đơn đặt sân cần check-in.
   * @returns {Promise<Booking>} - Đơn đặt sân sau khi đã cập nhật.
   */
  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Manager, Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Manager/Admin) Check-in cho khách hàng tại sân' })
  @ApiResponse({
    status: 200,
    description:
      'Check-in thành công. Trả về thông tin đơn đặt sân đã cập nhật.',
    type: Booking,
  })
  @ApiResponse({
    status: 400,
    description:
      'Đơn không hợp lệ để check-in (sai trạng thái, đã check-in...).',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền thực hiện.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn đặt sân.' })
  checkIn(@Body() checkInDto: CheckInDto) {
    this.logger.log(`Checking in booking ${checkInDto.bookingId}`);
    return this.bookingService.checkInCustomer(checkInDto.bookingId);
  }

  /**
   * @route GET /bookings/field/:fieldId/schedule
   * @description (Public) Lấy lịch các khung giờ đã được đặt của một sân trong một ngày cụ thể.
   * Hữu ích cho việc hiển thị lịch trực quan cho người dùng.
   * @param {string} fieldId - ID của sân bóng.
   * @param {string} date - Ngày cần xem lịch (định dạng YYYY-MM-DD).
   * @returns {Promise<object>} - Danh sách các khung giờ đã đặt.
   */
  @Get('field/:fieldId/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '(Public) Lấy lịch đặt sân theo ngày' })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách các booking trong ngày',
  })
  async getFieldSchedule(
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Query('date') date: string,
  ) {
    this.logger.log(`Getting schedule for field ${fieldId} on date ${date}`);
    return this.bookingService.getFieldSchedule(fieldId, date);
  }
}
