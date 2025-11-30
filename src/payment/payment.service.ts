import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import vnpayConfig from './config/vnpay.config';
import * as crypto from 'crypto';
import qs from 'qs';
import moment from 'moment';
import { ConfigType } from '@nestjs/config';
import { BookingService } from '@/booking/booking.service';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { VnpayIpnDto } from './dto/vnpay-ipn.dto';
import { NotificationService } from '@/notification/notification.service';
import { MailerService } from '@nestjs-modules/mailer';
import { EventGateway } from '@/event/event.gateway';

/**
 * @class PaymentService
 * @description Dịch vụ xử lý logic nghiệp vụ liên quan đến thanh toán, chủ yếu tích hợp với cổng thanh toán VNPAY.
 * Bao gồm việc tạo URL thanh toán, xác thực kết quả trả về từ VNPAY, và xử lý Instant Payment Notification (IPN).
 */
@Injectable()
export class PaymentService {
  private logger = new Logger(PaymentService.name);
  /**
   * @constructor
   * @description Khởi tạo PaymentService với các dependency cần thiết.
   * @param vnpayConfiguration Cấu hình VNPAY được inject từ file config.
   * @param bookingService Service để cập nhật trạng thái đặt sân.
   * @param paymentRepository Repository để tương tác với thực thể Payment.
   * @param voucherRepository Repository để tương tác với thực thể Voucher (cần cho việc hoàn voucher).
   * @param notificationService Service để tạo thông báo cho người dùng.
   * @param mailerService Service để gửi email xác nhận hoặc thông báo lỗi.
   * @param eventGateWay Gateway để gửi sự kiện real-time (WebSocket) đến client (ví dụ: admin).
   */
  constructor(
    @Inject(vnpayConfig.KEY)
    private readonly vnpayConfiguration: ConfigType<typeof vnpayConfig>,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly notificationService: NotificationService,
    private readonly mailerService: MailerService,
    private readonly eventGateWay: EventGateway
  ) { }

  /**
   * @method createVnPayUrl
   * @description Tạo URL thanh toán VNPAY. Phương thức này thu thập các tham số cần thiết, sắp xếp chúng, tạo chữ ký bảo mật (secure hash) và trả về một URL hoàn chỉnh để chuyển hướng người dùng.
   * @param amount Số tiền cần thanh toán.
   * @param orderId ID của đơn hàng (booking ID).
   * @param ipAddr Địa chỉ IP của người dùng.
   * @returns URL thanh toán VNPAY đã được ký.
   * @throws {Error} Nếu cấu hình VNPAY bị thiếu.
   */
  createVnPayUrl(amount: number, orderId: string, ipAddr: string): string {
    const { tmnCode, secretKey, url, returnUrl } = this.vnpayConfiguration;

    if (!secretKey || !url || !tmnCode || !returnUrl) {
      throw new Error('VNPAY configuration is missing');
    }

    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const orderIdStr = orderId.toString();

    let vnp_Params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderIdStr,
      vnp_OrderInfo: `Thanh toan don hang ${orderIdStr}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // VNPay tính đơn vị là hào, nên phải nhân 100
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // 1. Sắp xếp tham số (Quan trọng)
    vnp_Params = this.sortObject(vnp_Params);

    // 2. Tạo chuỗi ký
    const signData = qs.stringify(vnp_Params, { encode: false });

    // 3. Tạo chữ ký từ chuỗi trên(HMAC)
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    return `${url}?${qs.stringify(vnp_Params, { encode: false })}`;
  }

  /**
   * @method verifyReturnUrl
   * @description Xác thực chữ ký của URL trả về (vnpay_return) mà VNPAY chuyển hướng người dùng đến sau khi thanh toán. Phương thức này chỉ dùng để xác thực và hiển thị kết quả cho người dùng, **không** dùng để cập nhật trạng thái đơn hàng.
   * @param vnp_Params Các tham số query từ URL VNPAY trả về.
   * @returns Một đối tượng chứa trạng thái (thành công/thất bại) và thông tin giao dịch để hiển thị cho người dùng.
   */
  verifyReturnUrl(vnp_Params: Record<string, any>) {
    const vnp_Params_Data = { ...vnp_Params };
    const secureHash = vnp_Params['vnp_SecureHash'] as string;

    // Xóa 2 tham số không tham gia vào việc tạo hash
    delete vnp_Params_Data['vnp_SecureHash'];
    delete vnp_Params_Data['vnp_SecureHashType'];

    //Sắp xếp lại các tham số
    const sortedParams = this.sortObject(vnp_Params);

    const { secretKey } = this.vnpayConfiguration;
    if (!secretKey) {
      throw new Error('VNPAY configuration is missing');
    }
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const orderId = vnp_Params_Data['vnp_TxnRef'] as string;
    const amount = vnp_Params_Data['vnp_Amount']
      ? parseInt(String(vnp_Params_Data['vnp_Amount'])) / 100
      : 0;
    const responseCode = vnp_Params_Data['vnp_ResponseCode'] as string;
    const payDate = vnp_Params_Data['vnp_PayDate'] as string;

    if (secureHash === signed) {
      if (responseCode === '00') {
        // Giao dịch thành công
        return {
          isSuccess: true,
          message: 'Giao dịch thành công',
          orderId: orderId,
          amount: amount,
          rspCode: responseCode,
          payDate: payDate,
        };
      } else {
        // Giao dịch thất bại
        return {
          isSuccess: false,
          message: `Giao dịch không thành công. Mã lỗi: ${responseCode}`,
          orderId: orderId,
          amount: amount,
          rspCode: responseCode,
        };
      }
    } else {
      // Chữ ký không hợp lệ
      return {
        isSuccess: false,
        message: 'Chữ ký không hợp lệ',
        orderId: orderId,
        amount: amount,
        rspCode: '97',
      };
    }
  }

  /**
   * @method handleIpn
   * @description Xử lý Instant Payment Notification (IPN) do server VNPAY gửi đến. Đây là kênh giao tiếp server-to-server, đảm bảo tính toàn vẹn và là nguồn xác thực cuối cùng cho trạng thái giao dịch. Phương thức này sẽ xác thực chữ ký, kiểm tra thông tin đơn hàng và cập nhật trạng thái trong CSDL.
   * @param dto DTO chứa các tham số query từ yêu cầu IPN của VNPAY.
   * @returns Phản hồi cho server VNPAY biết đã nhận và xử lý thành công hay thất bại.
   */
  async handleIpn(
    dto: VnpayIpnDto,
  ): Promise<{ RspCode: string; Message: string }> {
    // Chuyển DTO sang object thuần để xử lý
    const vnp_Params = { ...dto } as Record<string, string | undefined>;
    const secureHash = String(vnp_Params['vnp_SecureHash'] ?? '');

    // 1.Kiểm tra chữ kí (Checksum)
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params);
    const secretKey = this.vnpayConfiguration.secretKey;
    if (!secretKey) {
      throw new Error('VNPAY configuration is missing');
    }

    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      return {
        RspCode: '97',
        Message: 'Chữ ký không hợp lệ',
      };
    }

    const bookingId = String(vnp_Params['vnp_TxnRef'] ?? '');
    const rspCode = String(vnp_Params['vnp_ResponseCode'] ?? '');
    // VNPay trả về amount * 100, nên cần chia 100 để về đúng tiền thật
    const vnp_Amount = parseInt(String(vnp_Params['vnp_Amount'] ?? '0')) / 100;

    //2. Lấy thêm thông tin từ params để lưu vào DB
    const transactionNo =
      vnp_Params['vnp_TransactionNo'] ||
      (vnp_Params['vnp_BankTranNo'] as string);
    const bankCode = vnp_Params['vnp_BankCode'] as string;
    const payDate = vnp_Params['vnp_PayDate'] as string;

    try {
      // Bước 1: Tìm Payment để check số tiền (finalAmount - đã trừ voucher)
      // Query theo Relation booking
      const payment = await this.paymentRepository.findOne({
        where: { booking: { id: bookingId }, status: PaymentStatus.PENDING },
        relations: [
          'voucher',
          'booking',
          'booking.userProfile',
          'booking.userProfile.account',
          'booking.field',
          'booking.field.address',
          'booking.field.address.ward',
          'booking.field.address.city',
        ],
      });
      if (!payment) {
        this.logger.warn(`Không tìm thấy dữ liệu cho booking ${bookingId}`);
        return {
          RspCode: '01',
          Message: 'Không tìm thấy đơn hàng',
        };
      }

      // Bước 2: Kiểm tra số tiền
      // vnp_Amount phải khớp với finalAmount trong DB
      if (Number(payment.finalAmount) !== vnp_Amount) {
        this.logger.warn(
          `Số tiền không hợp lệ. DB: ${payment.finalAmount}, VNPAY: ${vnp_Amount}`,
        );
        return {
          RspCode: '04',
          Message: 'Số tiền không khớp',
        };
      }

      const userEmail = payment.booking.userProfile.account.email;
      const fullName = payment.booking.userProfile.full_name;
      const fieldName = payment.booking.field.name;
      // Lấy địa chỉ đầy đủ của sân bóng.
      const fieldAddress = payment.booking.field.address
        ? `${payment.booking.field.address.street}, ${payment.booking.field.address.ward?.name || ''}, 
        ${payment.booking.field.address.city?.name || ''}`
          .replace(/,\s*,/g, ',')
          .trim()
          .replace(/,\s*$/, '')
        : 'N/A';
      const startTime = moment(payment.booking.start_time).format(
        'HH:mm [ngày] DD/MM/YYYY',
      );
      const endTime = moment(payment.booking.end_time).format(
        'HH:mm [ngày] DD/MM/YYYY',
      );
      const finalAmount = payment.finalAmount.toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
      });
      // Bước 3: Xử lý kết quả
      if (rspCode == '00') {
        // --- THÀNH CÔNG ---
        await this.bookingService.updateStatus(
          bookingId,
          BookingStatus.COMPLETED,
        );
        await this.updatePayment(
          payment,
          PaymentStatus.COMPLETED,
          transactionNo,
          bankCode,
          payDate,
        );
        await this.notificationService.createNotification({
          title: 'Thanh toán thành công',
          content: `Đơn đặt sân ${bookingId} của bạn đã được xác nhận. Chúc bạn có trận đấu vui vẻ!`,
          recipientId: payment.booking.userProfile.id,
        });

        await this.sendEmailSafely({
          to: userEmail,
          subject: 'Xác nhận đặt sân thành công',
          template: './booking-success',
          context: {
            full_name: fullName,
            fieldName: fieldName,
            fieldAddress: fieldAddress,
            startTime: startTime,
            endTime: endTime,
            finalAmount: finalAmount,
            bookingId: bookingId,
            frontendUrl:
              this.vnpayConfiguration.returnUrl?.split(
                '/payment/vnpay_return',
              )[0] ?? '',
            currentYear: new Date().getFullYear(),
          },
        });

        this.eventGateWay.notifyAdminNewBooking({
          message: `Có đơn đặt sân mới!`,
          bookingId: bookingId,
          field: fieldName,
          amount: finalAmount,
          time: new Date()
        });
        this.logger.log(`Booking ${bookingId} đã được xác nhận`);
      } else {
        // --- THẤT BẠI ---
        await this.bookingService.updateStatus(
          bookingId,
          BookingStatus.CANCELLED,
        );
        await this.updatePayment(
          payment,
          PaymentStatus.FAILED,
          transactionNo,
          bankCode,
          payDate,
        );
        await this.notificationService.createNotification({
          title: 'Thanh toán thất bại',
          content: `Giao dịch cho đơn ${bookingId} không thành công. Vui lòng thử lại.`,
          recipientId: payment.booking.userProfile.id,
        });
        if (payment.voucher) {
          await this.voucherRepository.increment(
            { id: payment.voucher.id },
            'quantity',
            1,
          );
          this.logger.log(`Voucher ${payment.voucher.code} đã được hoàn lại`);
        }

        await this.sendEmailSafely({
          to: userEmail,
          subject: 'Thông báo giao dịch đặt sân thất bại',
          template: './booking-failed',
          context: {
            full_name: fullName,
            fieldName: fieldName,
            startTime: startTime,
            endTime: endTime,
            finalAmount: finalAmount,
            bookingId: bookingId,
            reason: 'Giao dịch bị hủy hoặc lỗi từ ngân hàng.',
          },
        });
        this.logger.log(`Booking ${bookingId} đã bị hủy`);
      }

      return {
        RspCode: '00',
        Message: 'Xác nhận thành công',
      };
    } catch (error) {
      this.logger.error(
        `Lỗi trong quá trình xử lí IPN cho Booking ${bookingId}`,
        error,
      );
      return {
        RspCode: '99',
        Message: 'Lỗi không xác định',
      };
    }
  }

  /**
   * @method sortObject
   * @description (Private) Sắp xếp các thuộc tính của một đối tượng theo thứ tự bảng chữ cái. Đây là yêu cầu bắt buộc của VNPAY để tạo chữ ký (secure hash).
   * @private
   * @param obj Đối tượng cần sắp xếp.
   * @returns Đối tượng đã được sắp xếp.
   */
  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort(); // Sắp xếp key theo alphabet

    keys.forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = obj[key];
      const valueString =
        value === null || value === undefined ? '' : String(value);

      // VNPAY yêu cầu encode giá trị trước khi tạo chuỗi query
      sorted[key] = encodeURIComponent(valueString).replace(/%20/g, '+');
    });
    return sorted;
  }

  /**
   * @method updatePayment
   * @description (Private) Cập nhật thông tin chi tiết của một bản ghi thanh toán trong cơ sở dữ liệu sau khi nhận kết quả từ VNPAY.
   * @private
   * @param payment Thực thể Payment cần cập nhật.
   * @param status Trạng thái mới của thanh toán.
   * @param transactionNo Mã giao dịch từ VNPAY.
   * @param bankCode Mã ngân hàng từ VNPAY.
   * @param payDate Ngày thanh toán từ VNPAY (định dạng 'YYYYMMDDHHmmss').
   */
  private async updatePayment(
    payment: Payment,
    status: PaymentStatus,
    transactionNo: string,
    bankCode: string,
    payDate: string,
  ): Promise<void> {
    try {
      payment.status = status;
      payment.transactionCode = transactionNo;
      payment.bankCode = bankCode;

      if (status === PaymentStatus.COMPLETED && payDate) {
        payment.completedAt = moment(payDate, 'YYYYMMDDHHmmss').toDate();
      }

      await this.paymentRepository.save(payment);
    } catch (error) {
      this.logger.error(
        `Lỗi trong quá trình cập nhật Payment ${payment.id}`,
        error,
      );
    }
  }

  /**
   * @method findByBookingId
   * @description Tìm một bản ghi thanh toán dựa vào ID của đơn đặt sân (booking).
   * @param bookingId ID của đơn đặt sân liên quan.
   * @returns Promise giải quyết về thực thể `Payment` nếu tìm thấy (kèm theo thông tin voucher), ngược lại là `null`.
   */
  async findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { booking: { id: bookingId } },
      relations: {
        voucher: true,
      },
    });
  }

  /**
   * @method sendEmailSafely
   * @description (Private) Gửi email một cách an toàn, bắt lỗi nếu có sự cố xảy ra và ghi log thay vì làm sập luồng chính.
   * @private
   * @param mailOptions Các tùy chọn để gửi mail (to, subject, template, context).
   */
  private async sendEmailSafely(mailOptions: {
    to: string;
    subject: string;
    template: string;
    context: object;
  }) {
    try {
      await this.mailerService.sendMail(mailOptions);
    } catch (error) {
      // Ghi log lỗi chi tiết mà không ném ra ngoại lệ để không ảnh hưởng đến luồng IPN
      this.logger.error(`Gửi email thất bại đến ${mailOptions.to}:`, error);
    }
  }

  /**
   * @method getStats
   * @description Thống kê doanh thu và số lượng giao dịch theo trạng thái trong một khoảng thời gian.
   * @param {string} [startDate] - Ngày bắt đầu (định dạng YYYY-MM-DD).
   * @param {string} [endDate] - Ngày kết thúc (định dạng YYYY-MM-DD).
   * @returns {Promise<{ revenue: number; transactions: Record<string, number> }>} - Một đối tượng chứa tổng doanh thu và số lượng giao dịch theo từng trạng thái.
   */
  async getStats(startDate?: string, endDate?: string) {
    const query = this.paymentRepository.createQueryBuilder('payment');
    if (!query) {
      this.logger.error(
        'Failed to create query builder for payment statistics.',
      );
      return {
        revenue: 0,
        transactions: {},
      };
    }

    if (startDate && endDate) {
      query.where('payment.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });
    }

    // Sửa lỗi any của getRawOne
    interface RevenueResult {
      total: string | null;
    }
    // 1. Tổng doanh thu (Chỉ tính đơn COMPLETED)
    const revenue = await query
      .clone()
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .select('SUM(payment.finalAmount)', 'total')
      .getRawOne<RevenueResult>();

    interface StatusCountResult {
      status: string;
      count: string;
    }
    // 2. Số lượng đơn theo trạng thái
    const statusCounts = await query
      .clone()
      .select('payment.status', 'status')
      .addSelect('COUNT(payment.id)', 'count')
      .groupBy('payment.status')
      .getRawMany<StatusCountResult>();

    const transaction = statusCounts.reduce(
      (acc: Record<string, number>, curr) => {
        // Ép kiểu
        const status = curr.status;
        const count = Number(curr.count);

        acc[status] = count;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      revenue: Number(revenue?.total || 0),
      transactions: transaction,
    };
  }

  /**
   * @method getRevenueChart
   * @description Lấy dữ liệu doanh thu hàng tháng cho một năm cụ thể để vẽ biểu đồ.
   * @param {number} year - Năm cần lấy dữ liệu.
   * @returns {Promise<Array<{ month: number; revenue: number }>>} - Một mảng các đối tượng, mỗi đối tượng chứa tháng và doanh thu của tháng đó.
   */
  async getRevenueChart(year: number) {
    interface RevenueChartRow {
      month: number;
      revenue: number;
    }
    const result: RevenueChartRow[] = await this.paymentRepository.query(
      `SELECT MONTH(created_at) as month, SUM(final_amount) as revenue
      FROM Payment
      WHERE status='completed' AND YEAR(created_at) = ?
      GROUP BY MONTH(created_at)
      `,
      [year],
    );

    if (!result) {
      this.logger.error('Failed to retrieve revenue chart data.');
      return [];
    }

    return result;
  }
}
