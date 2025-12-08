import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BookingService } from '@/booking/booking.service';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { User } from '@/auth/decorator/users.decorator';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { VnpayIpnDto } from './dto/vnpay-ipn.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';
import { SkipThrottle } from '@nestjs/throttler';
import { VnpayReturnDto } from './dto/vnpay-return.dto';

/**
 * @controller PaymentController
 * @description Xử lý các yêu cầu HTTP liên quan đến thanh toán.
 * Chịu trách nhiệm tích hợp với cổng thanh toán VNPAY, bao gồm tạo URL thanh toán,
 * xử lý URL trả về (return URL) và URL thông báo tức thì (IPN).
 * Đồng thời cung cấp các endpoint cho việc thống kê doanh thu.
 */
@ApiTags('Payment (Thanh toán & Thống kê)')
@Controller('payment')
export class PaymentController {
  /**
   * @constructor
   * @param {PaymentService} paymentService - Service xử lý logic thanh toán.
   * @param {BookingService} bookingService - Service để truy vấn thông tin đặt sân.
   */
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * @route POST /payment/create_payment_url
   * @description (Public) Tạo URL thanh toán VNPAY cho một đơn đặt sân đã tồn tại.
   * Thường được dùng khi người dùng muốn thử thanh toán lại cho một đơn hàng đang ở trạng thái `PENDING`.
   * @param {string} bookingId - ID của đơn đặt sân cần tạo link thanh toán.
   * @param {Request} req - Đối tượng request để lấy địa chỉ IP của người dùng.
   * @returns {Promise<{ url: string }>} - Một đối tượng chứa URL thanh toán VNPAY.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân hoặc thông tin thanh toán tương ứng.
   * @throws {BadRequestException} Nếu đơn đặt sân đã được xử lý (đã thanh toán hoặc hủy).
   */
  @Post('create_payment_url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '(Public) Tạo URL thanh toán VNPAY cho đơn đặt sân' })
  @SkipThrottle()
  @ApiBody({
    schema: { properties: { bookingId: { type: 'string', format: 'uuid' } } },
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về URL thanh toán VNPAY.',
    schema: { properties: { url: { type: 'string' } } },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt sân hoặc thông tin thanh toán.',
  })
  @ApiResponse({
    status: 400,
    description: 'Đơn đặt sân đã được xử lý trước đó.',
  })
  async createPaymentUrl(
    @Body('bookingId') bookingId: string,
    @Req() req: Request,
  ) {
    // 1. Tìm đơn hàng để lấy số tiền CHÍNH XÁC trong DB
    const booking = await this.bookingService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Đơn đặt sân đã được xác nhận hoặc hoàn thành.',
      );
    }

    // 2. Lấy số tiền CHUẨN từ bảng Payment (đã trừ Voucher)
    const payment = await this.paymentService.findByBookingId(bookingId);
    if (!payment) {
      throw new NotFoundException(
        'Không tìm thấy thông tin thanh toán cho đơn đặt sân.',
      );
    }

    // 3. Lấy IP
    let ipAddr =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    if (Array.isArray(ipAddr)) {
      ipAddr = ipAddr[0];
    }
    const ip = ipAddr ? ipAddr.toString() : '127.0.0.1';

    // 4. Tạo URL
    const url = this.paymentService.createVnPayUrl(
      Number(payment.finalAmount),
      booking.id,
      ip,
    );

    return { url };
  }

  /**
   * @route GET /payment/vnpay_return
   * @description Endpoint mà VNPAY chuyển hướng người dùng về sau khi hoàn tất thanh toán.
   * Nhiệm vụ chính là xác thực chữ ký (checksum) và hiển thị kết quả giao dịch cho người dùng phía client.
   * **Lưu ý quan trọng:** Endpoint này không dùng để cập nhật trạng thái đơn hàng vì không đáng tin cậy (client có thể không được chuyển hướng về).
   */
  @Get('vnpay_return')
  @ApiOperation({ summary: '(VNPAY) Xử lý URL trả về cho phía Client' })
  @SkipThrottle()
  @ApiResponse({
    status: 200,
    description: 'Giao dịch thành công (phía client).',
  })
  @ApiResponse({
    status: 400,
    description: 'Giao dịch thất bại hoặc chữ ký không hợp lệ.',
  })
  vnpayReturn(
    @Query() query: VnpayReturnDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Gọi service để kiểm tra chữ ký (secure hash) và trạng thái giao dịch
    const result = this.paymentService.verifyReturnUrl(
      query as unknown as Record<string, any>,
    );

    // Xử lý kết quả
    if (result.isSuccess) {
      res.status(HttpStatus.OK);
      return {
        message: 'Thanh toán thành công',
        data: result,
      };
    } else {
      res.status(HttpStatus.BAD_REQUEST);
      return {
        message: 'Thanh toán thất bại',
        data: result,
      };
    }
  }

  /**
   * @route GET /payment/vnpay_ipn
   * @description (Quan trọng) Endpoint để nhận Instant Payment Notification (IPN) từ server VNPAY.
   * Đây là một yêu cầu server-to-server, dùng để cập nhật trạng thái cuối cùng và đáng tin cậy của đơn hàng.
   * Luồng này đảm bảo đơn hàng được cập nhật kể cả khi người dùng tắt trình duyệt sau khi thanh toán.
   */
  @Get('vnpay_ipn')
  @ApiOperation({
    summary:
      '(VNPAY) Xử lý IPN để cập nhật trạng thái đơn hàng (Server-to-Server)',
  })
  @ApiResponse({
    status: 200,
    description: 'Phản hồi cho server VNPAY biết đã nhận và xử lý.',
  })
  vnpayIpn(
    @Query() query: VnpayIpnDto,
  ): Promise<{ RspCode: string; Message: string }> {
    return this.paymentService.handleIpn(query);
  }

  /**
   * @route GET /payment/stats/overview
   * @description Lấy thống kê tổng quan về doanh thu đặt sân.
   * - Admin: Xem toàn bộ hệ thống hoặc lọc theo chi nhánh.
   * - Manager: Chỉ xem chi nhánh của mình.
   * @param {AuthenticatedUser} user - Người dùng đang thực hiện yêu cầu.
   * @param {string} [startDate] - Ngày bắt đầu để lọc (YYYY-MM-DD).
   * @param {string} [endDate] - Ngày kết thúc để lọc (YYYY-MM-DD).
   * @param {string} [branchId] - (Chỉ Admin) ID của chi nhánh muốn lọc.
   * @returns {Promise<object>} - Một đối tượng chứa tổng doanh thu và số lượng giao dịch theo từng trạng thái.
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager) // Cho phép cả Admin và Manager
  @ApiBearerAuth()
  @ApiOperation({
    summary: '(Admin/Manager) Lấy thống kê tổng quan doanh thu đặt sân',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    type: String,
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: '(Chỉ Admin) Lọc theo ID chi nhánh cụ thể',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về dữ liệu thống kê thành công.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async getAdminStats(
    @User() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    const userBranchId = user.branch_id || undefined;
    // Nếu là Manager, chỉ được xem chi nhánh của mình và không được dùng filter branchId
    if (user.role === Role.Manager) {
      return this.paymentService.getStats(startDate, endDate, userBranchId);
    }
    // Admin có thể xem tất cả hoặc lọc theo chi nhánh
    return this.paymentService.getStats(startDate, endDate, branchId);
  }

  /**
   * @route GET /payment/chart
   * @description Lấy dữ liệu doanh thu đặt sân hàng tháng trong một năm để vẽ biểu đồ.
   * - Admin: Xem toàn bộ hệ thống hoặc lọc theo chi nhánh.
   * - Manager: Chỉ xem chi nhánh của mình.
   * @param {AuthenticatedUser} user - Người dùng đang thực hiện yêu cầu.
   * @param {number} [year] - Năm cần lấy dữ liệu (mặc định là năm hiện tại).
   * @param {string} [branchId] - (Chỉ Admin) ID của chi nhánh muốn lọc.
   * @returns {Promise<Array<object>>} - Mảng dữ liệu doanh thu theo từng tháng.
   */
  @Get('chart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager) // Cho phép cả Admin và Manager
  @ApiBearerAuth()
  @ApiOperation({
    summary: '(Admin/Manager) Lấy dữ liệu doanh thu hàng tháng cho biểu đồ',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Năm cần xem (mặc định là năm hiện tại)',
    type: Number,
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: '(Chỉ Admin) Lọc theo ID chi nhánh cụ thể',
  })
  async getRevenueChart(
    @User() user: AuthenticatedUser,
    @Query('year') year: number = new Date().getFullYear(),
    @Query('branchId') branchId?: string,
  ) {
    const userBranchId = user.branch_id || undefined;
    const targetBranchId = user.role === Role.Manager ? userBranchId : branchId;
    return this.paymentService.getRevenueChart(year, targetBranchId);
  }
}
