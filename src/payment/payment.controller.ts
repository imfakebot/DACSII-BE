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
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request, Response } from 'express';
import { BookingService } from '@/booking/booking.service';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { VnpayReturnDto } from './dto/vnpay-return.dto';
import { VnpayIpnDto } from './dto/vnpay-ipn.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

/**
 * @controller PaymentController
 * @description Xử lý các yêu cầu HTTP liên quan đến thanh toán, đặc biệt là tích hợp với VNPAY.
 * Bao gồm tạo URL thanh toán, xử lý URL trả về (return) và URL thông báo tức thì (IPN).
 */
@ApiTags('Payment (Thanh toán VNPAY)')
@Controller('payment')
export class PaymentController {
  /**
   * @constructor
   * @param {PaymentService} paymentService - Service xử lý logic thanh toán VNPAY.
   * @param {BookingService} bookingService - Service để truy vấn thông tin đặt sân.
   */
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
  ) { }

  /**
   * @route POST /payment/create_payment_url
   * @description Tạo URL thanh toán VNPAY cho một đơn đặt sân đã tồn tại.
   * Endpoint này được gọi khi người dùng muốn thanh toán cho một đơn hàng đã tạo trước đó (ví dụ: thanh toán lại).
   * @param {string} bookingId - ID của đơn đặt sân cần tạo link thanh toán.
   * @param {Request} req - Đối tượng request để lấy địa chỉ IP của người dùng.
   * @returns {Promise<{ url: string }>} - Một đối tượng chứa URL thanh toán VNPAY.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân hoặc thông tin thanh toán tương ứng.
   * @throws {BadRequestException} Nếu đơn đặt sân đã được xác nhận hoặc hoàn thành.
   */
  @Post('create_payment_url')
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPAY cho một đơn đặt sân' })
  @SkipThrottle()
  @ApiBody({
    schema: { properties: { bookingId: { type: 'string', format: 'uuid' } } },
  })
  @ApiResponse({
    status: 201,
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
   * @description Endpoint mà VNPAY chuyển hướng người dùng về sau khi hoàn tất thanh toán trên cổng VNPAY.
   * Nhiệm vụ chính là xác thực chữ ký (checksum) và hiển thị kết quả giao dịch cho người dùng.
   * **Lưu ý:** Không cập nhật trạng thái đơn hàng ở đây vì không đáng tin cậy.
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
   * Luồng này đảm bảo đơn hàng được cập nhật kể cả khi người dùng tắt trình duyệt.
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
   * @route GET /payment/admin/stats
   * @description (Admin) Lấy thống kê tổng quan về doanh thu và số lượng giao dịch.
   * Endpoint này cho phép lọc theo một khoảng thời gian cụ thể.
   * @param {string} [startDate] - Ngày bắt đầu để lọc (định dạng YYYY-MM-DD).
   * @param {string} [endDate] - Ngày kết thúc để lọc (định dạng YYYY-MM-DD).
   * @returns {Promise<object>} - Một đối tượng chứa tổng doanh thu và số lượng giao dịch theo từng trạng thái.
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAdminStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentService.getStats(startDate, endDate);
  }

  /**
   * @route GET /payment/admin/chart
   * @description (Admin) Lấy dữ liệu doanh thu hàng tháng để vẽ biểu đồ.
   * @param {number} [year=current_year] - Năm cần lấy dữ liệu. Mặc định là năm hiện tại.
   * @returns {Promise<Array<object>>} - Một mảng các đối tượng, mỗi đối tượng chứa thông tin doanh thu của một tháng.
   */
  @Get('admin/chart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getRevenueChart(
    @Query('year') year: number = new Date().getFullYear(),
  ) {
    return this.paymentService.getRevenueChart(year);
  }
}
