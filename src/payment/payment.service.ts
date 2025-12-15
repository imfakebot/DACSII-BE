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
import * as QRCode from 'qrcode';

/**
 * @class PaymentService
 * @description Chịu trách nhiệm xử lý logic nghiệp vụ liên quan đến thanh toán và thống kê doanh thu.
 * - Tích hợp với cổng thanh toán VNPAY: tạo URL, xác thực return URL và xử lý IPN.
 * - Cung cấp các phương thức thống kê doanh thu theo thời gian và chi nhánh.
 */
@Injectable()
export class PaymentService {
  private logger = new Logger(PaymentService.name);

  /**
   * @constructor
   * @param vnpayConfiguration - Cấu hình VNPAY được inject.
   * @param bookingService - Service để tương tác với các đơn đặt sân.
   * @param paymentRepository - Repository để tương tác với bảng `payments`.
   * @param voucherRepository - Repository để tương tác với bảng `vouchers`.
   * @param notificationService - Service để tạo và gửi thông báo.
   * @param mailerService - Service để gửi email.
   * @param eventGateWay - Gateway để gửi sự kiện real-time.
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
    private readonly eventGateWay: EventGateway,
  ) { }

  /**
   * @method createVnPayUrl
   * @description Tạo URL thanh toán VNPAY với các tham số cần thiết.
   * @param {number} amount - Số tiền cần thanh toán.
   * @param {string} orderId - ID của đơn hàng (booking ID).
   * @param {string} ipAddr - Địa chỉ IP của người dùng.
   * @returns {string} - URL thanh toán VNPAY hoàn chỉnh.
   * @throws {Error} Nếu thiếu cấu hình VNPAY.
   */
  createVnPayUrl(amount: number, orderId: string, ipAddr: string): string {
    const { tmnCode, secretKey, url, returnUrl } = this.vnpayConfiguration;
    if (!secretKey) throw new Error('VNPAY Secret Key is missing');

    // 1. Config Params
    const vnp_Params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode ?? '',
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId.replace(/-/g, ''), // Đảm bảo mã này là duy nhất cho mỗi lần thanh toán
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.floor(amount * 100),
      vnp_ReturnUrl: returnUrl ?? '',
      vnp_IpAddr: ipAddr || '127.0.0.1', // Nên dùng IP thực của client
      vnp_CreateDate: moment(new Date()).format('YYYYMMDDHHmmss'),
    };

    // 2. Sắp xếp tham số (Manual Sort A-Z)
    // Bước này quan trọng để đảm bảo thứ tự
    const sortedKeys = Object.keys(vnp_Params).sort();
    const sortedParams: Record<string, string | number> = {};
    sortedKeys.forEach(key => {
      sortedParams[key] = vnp_Params[key];
    });

    // 3. Ký (FIX: Dùng qs.stringify để encode giá trị ngay tại bước này)
    // encode: true là mặc định, nhưng viết rõ ra để dễ kiểm soát
    const signData = qs.stringify(sortedParams, { encode: true });

    this.logger.debug(`🔑 Key đang dùng: ${secretKey?.substring(0, 5)}...`);
    this.logger.debug(`📝 Chuỗi mang đi ký (Encoded): ${signData}`);

    // 4. Hash (HMAC SHA512)
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 5. Tạo URL
    // Thêm mã hash vào params
    sortedParams['vnp_SecureHash'] = signed;

    // Tạo URL cuối cùng (Lưu ý: không cần sort lại vì sortedParams đã sort rồi, nhưng qs stringify có thể đổi thứ tự nếu không cẩn thận, tuy nhiên URL param order không ảnh hưởng việc nhận diện hash của VNPay, chỉ ảnh hưởng lúc ký thôi)
    const finalUrl = url + '?' + qs.stringify(sortedParams, { encode: true });

    this.logger.debug(`🚀 Final URL: ${finalUrl}`);

    return finalUrl;

  }

  /**
   * @method verifyReturnUrl
   * @description Xác thực chữ ký (secure hash) từ VNPAY trả về trên URL phía client.
   * Chỉ dùng để hiển thị kết quả cho người dùng, không cập nhật CSDL.
   * @param {Record<string, any>} vnp_Params - Các tham số query từ VNPAY.
   * @returns {object} - Một đối tượng chứa kết quả xác thực.
   */
  verifyReturnUrl(vnp_Params: Record<string, any>) {
    const vnp_Params_Data = { ...vnp_Params };
    const secureHash = vnp_Params['vnp_SecureHash'] as string;

    delete vnp_Params_Data['vnp_SecureHash'];
    delete vnp_Params_Data['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params_Data);

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
        return {
          isSuccess: true,
          message: 'Giao dịch thành công',
          orderId: orderId,
          amount: amount,
          rspCode: responseCode,
          payDate: payDate,
        };
      } else {
        return {
          isSuccess: false,
          message: `Giao dịch không thành công. Mã lỗi: ${responseCode}`,
          orderId: orderId,
          amount: amount,
          rspCode: responseCode,
        };
      }
    } else {
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
   * @description Xử lý thông báo IPN (Instant Payment Notification) từ server VNPAY.
   * Đây là phương thức đáng tin cậy để cập nhật trạng thái cuối cùng của giao dịch.
   * @param {VnpayIpnDto} dto - DTO chứa dữ liệu IPN từ VNPAY.
   * @returns {Promise<{ RspCode: string; Message: string }>} - Phản hồi cho server VNPAY.
   */
  async handleIpn(
    dto: VnpayIpnDto,
  ): Promise<{ RspCode: string; Message: string }> {
    const vnp_Params = { ...dto } as Record<string, string | undefined>;
    const secureHash = String(vnp_Params['vnp_SecureHash'] ?? '');

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
      return { RspCode: '97', Message: 'Chữ ký không hợp lệ' };
    }

    const bookingId = String(vnp_Params['vnp_TxnRef'] ?? '');
    const rspCode = String(vnp_Params['vnp_ResponseCode'] ?? '');
    const vnp_Amount = parseInt(String(vnp_Params['vnp_Amount'] ?? '0')) / 100;

    const transactionNo =
      vnp_Params['vnp_TransactionNo'] ||
      (vnp_Params['vnp_BankTranNo'] as string);
    const bankCode = vnp_Params['vnp_BankCode'] as string;
    const payDate = vnp_Params['vnp_PayDate'] as string;

    try {
      const payment = await this.paymentRepository.findOne({
        where: { booking: { id: bookingId }, status: PaymentStatus.PENDING },
        relations: [
          'voucher',
          'booking',
          'booking.userProfile',
          'booking.userProfile.account',
          'booking.field',
          'booking.field.branch',
          'booking.field.branch.address',
          'booking.field.branch.address.ward',
          'booking.field.branch.address.city',
        ],
      });

      if (!payment) {
        this.logger.warn(`Không tìm thấy dữ liệu cho booking ${bookingId}`);
        return { RspCode: '01', Message: 'Không tìm thấy đơn hàng' };
      }

      if (Number(payment.finalAmount) !== vnp_Amount) {
        this.logger.warn(
          `Số tiền không hợp lệ. DB: ${payment.finalAmount}, VNPAY: ${vnp_Amount}`,
        );
        return { RspCode: '04', Message: 'Số tiền không khớp' };
      }

      const userEmail = payment.booking.userProfile.account.email;
      const fullName = payment.booking.userProfile.full_name;
      const fieldName = payment.booking.field.name;

      const branchAddressObj = payment.booking.field.branch?.address;
      const fieldAddress = branchAddressObj
        ? `${branchAddressObj.street}, ${branchAddressObj.ward?.name || ''}, ${branchAddressObj.city?.name || ''
          }`
          .replace(/,\s*,/g, ',')
          .trim()
          .replace(/,\s*$/, '')
        : 'Đang cập nhật';

      const startTime = moment(payment.booking.start_time).format(
        'HH:mm [ngày] DD/MM/YYYY',
      );
      const endTime = moment(payment.booking.end_time).format(
        'HH:mm [ngày] DD/MM/YYYY',
      );
      const finalAmountStr = payment.finalAmount.toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
      });

      if (rspCode == '00') {
        // --- GIAO DỊCH THÀNH CÔNG ---
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
          content: `Đơn đặt sân ${bookingId} của bạn đã được xác nhận.`,
          recipientId: payment.booking.userProfile.id,
        });

        const qrCodeImage = await this.generateQRCode(bookingId);

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
            finalAmount: finalAmountStr,
            bookingId: bookingId,
            qrCode: qrCodeImage,
            frontendUrl:
              this.vnpayConfiguration.returnUrl?.split(
                '/payment/vnpay_return',
              )[0] ?? '',
            currentYear: new Date().getFullYear(),
          },
        });

        this.eventGateWay.notifyAdminsNewFeedback({
          message: `Có đơn đặt sân mới!`,
          bookingId: bookingId,
          field: fieldName,
          amount: finalAmountStr,
          time: new Date(),
        });
        this.logger.log(`Booking ${bookingId} đã được xác nhận`);
      } else {
        // --- GIAO DỊCH THẤT BẠI ---
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
          content: `Giao dịch cho đơn ${bookingId} không thành công.`,
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
            finalAmount: finalAmountStr,
            bookingId: bookingId,
            reason: 'Giao dịch bị hủy hoặc lỗi từ ngân hàng.',
          },
        });
        this.logger.log(`Booking ${bookingId} đã bị hủy`);
      }

      return { RspCode: '00', Message: 'Xác nhận thành công' };
    } catch (error) {
      this.logger.error(
        `[VNPAY IPN ERROR] Lỗi xử lí cho Booking ID ${bookingId}:`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
      return { RspCode: '99', Message: 'Lỗi không xác định' };
    }
  }

  /**
   * @method findByBookingId
   * @description Tìm một bản ghi thanh toán dựa trên ID của đơn đặt sân.
   * @param {string} bookingId - ID của đơn đặt sân.
   * @returns {Promise<Payment | null>} - Bản ghi thanh toán hoặc null nếu không tìm thấy.
   */
  async findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { booking: { id: bookingId } },
      relations: { voucher: true },
    });
  }

  /**
   * @method getStats
   * @description Lấy thống kê tổng quan về doanh thu và số lượng giao dịch đặt sân.
   * @param {string} [startDate] - Ngày bắt đầu lọc (YYYY-MM-DD).
   * @param {string} [endDate] - Ngày kết thúc lọc (YYYY-MM-DD).
   * @param {string} [branchId] - ID của chi nhánh cần lọc.
   * @returns {Promise<object>} - Đối tượng chứa `revenue` (tổng doanh thu) và `transactions` (số lượng theo trạng thái).
   */
  async getStats(startDate?: string, endDate?: string, branchId?: string) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.field', 'field')
      .leftJoin('field.branch', 'branch');

    if (startDate && endDate) {
      query.where('payment.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });
    }

    if (branchId) {
      query.andWhere('branch.id = :branchId', { branchId });
    }

    // 1. Tổng doanh thu (Chỉ tính đơn COMPLETED)
    const revenue = await query
      .clone()
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .select('SUM(payment.finalAmount)', 'total')
      .getRawOne<{ total: string | null }>();

    // 2. Số lượng đơn theo trạng thái
    const statusCounts = await query
      .clone()
      .select('payment.status', 'status')
      .addSelect('COUNT(payment.id)', 'count')
      .groupBy('payment.status')
      .getRawMany<{ status: string; count: string }>();

    const transaction = statusCounts.reduce(
      (acc, curr) => {
        acc[curr.status] = Number(curr.count);
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
   * @description Lấy dữ liệu doanh thu đặt sân theo từng tháng trong một năm để vẽ biểu đồ.
   * @param {number} year - Năm cần lấy dữ liệu.
   * @param {string} [branchId] - ID của chi nhánh cần lọc.
   * @returns {Promise<Array<{ month: number; revenue: number }>>} - Mảng dữ liệu doanh thu.
   */
  async getRevenueChart(year: number, branchId?: string) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .select('MONTH(payment.createdAt)', 'month')
      .addSelect('SUM(payment.finalAmount)', 'revenue')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.field', 'field')
      .leftJoin('field.branch', 'branch')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('YEAR(payment.createdAt) = :year', { year });

    if (branchId) {
      query.andWhere('branch.id = :branchId', { branchId });
    }

    query.groupBy('month').orderBy('month', 'ASC');

    const result = await query.getRawMany<{
      month: string | number;
      revenue: string | number;
    }>();

    return result.map((row) => ({
      month: Number(row.month),
      revenue: Number(row.revenue),
    }));
  }

  /**
   * @private
   * @method sortObject
   * @description Sắp xếp các key của object theo thứ tự alphabet (a-z).
   * QUAN TRỌNG: Hàm này chỉ sắp xếp và chuyển về string, KHÔNG encode URL.
   * Dữ liệu trả về sẽ dùng để tạo chuỗi Hash (Raw data).
   */
  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort(); // 1. Sắp xếp key a-z

    keys.forEach((key) => {
      // 2. Chỉ lấy các tham số có giá trị thực (không null, undefined hoặc rỗng)
      // Tài liệu Java mẫu (trang 37) có check: if (fieldValue != null && fieldValue.length > 0) [cite: 1183]
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        sorted[key] = String(obj[key]); // 3. Chỉ convert sang string, KHÔNG encodeURIComponent tại đây
      }
    });

    return sorted;
  }

  /**
   * @private
   * @method updatePayment
   * @description Cập nhật trạng thái và thông tin giao dịch cho một bản ghi thanh toán.
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
      this.logger.error(`Lỗi cập nhật Payment ${payment.id}`, error);
    }
  }

  /**
   * @private
   * @method sendEmailSafely
   * @description Gửi email một cách an toàn, bắt lỗi nếu có sự cố.
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
      this.logger.error(`Gửi email thất bại đến ${mailOptions.to}:`, error);
    }
  }

  /**
   * @private
   * @method generateQRCode
   * @description Tạo mã QR code từ một chuỗi dữ liệu và trả về dưới dạng Data URL.
   * @param {string} data - Dữ liệu cần mã hóa.
   * @returns {Promise<string>} - Chuỗi Data URL của ảnh QR code.
   */
  private async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data);
    } catch (err) {
      this.logger.error('Lỗi tạo QR Code', err);
      return '';
    }
  }
}
