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

@Injectable()
export class PaymentService {
  private logger = new Logger(PaymentService.name);

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
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    vnp_Params = this.sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    return `${url}?${qs.stringify(vnp_Params, { encode: false })}`;
  }

  verifyReturnUrl(vnp_Params: Record<string, any>) {
    const vnp_Params_Data = { ...vnp_Params };
    const secureHash = vnp_Params['vnp_SecureHash'] as string;

    delete vnp_Params_Data['vnp_SecureHash'];
    delete vnp_Params_Data['vnp_SecureHashType'];

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

    const transactionNo = vnp_Params['vnp_TransactionNo'] || (vnp_Params['vnp_BankTranNo'] as string);
    const bankCode = vnp_Params['vnp_BankCode'] as string;
    const payDate = vnp_Params['vnp_PayDate'] as string;

    try {
      // --- CẬP NHẬT QUERY RELATIONS ĐỂ LẤY ĐỊA CHỈ TỪ BRANCH ---
      const payment = await this.paymentRepository.findOne({
        where: { booking: { id: bookingId }, status: PaymentStatus.PENDING },
        relations: [
          'voucher',
          'booking',
          'booking.userProfile',
          'booking.userProfile.account',
          'booking.field',
          'booking.field.branch',             // Thêm branch
          'booking.field.branch.address',     // Lấy address từ branch
          'booking.field.branch.address.ward',
          'booking.field.branch.address.city',
        ],
      });

      if (!payment) {
        this.logger.warn(`Không tìm thấy dữ liệu cho booking ${bookingId}`);
        return { RspCode: '01', Message: 'Không tìm thấy đơn hàng' };
      }

      if (Number(payment.finalAmount) !== vnp_Amount) {
        this.logger.warn(`Số tiền không hợp lệ. DB: ${payment.finalAmount}, VNPAY: ${vnp_Amount}`);
        return { RspCode: '04', Message: 'Số tiền không khớp' };
      }

      const userEmail = payment.booking.userProfile.account.email;
      const fullName = payment.booking.userProfile.full_name;
      const fieldName = payment.booking.field.name;

      // --- SỬA LOGIC LẤY ĐỊA CHỈ ---
      const branchAddressObj = payment.booking.field.branch?.address;
      const fieldAddress = branchAddressObj
        ? `${branchAddressObj.street}, ${branchAddressObj.ward?.name || ''}, ${branchAddressObj.city?.name || ''}`
          .replace(/,\s*,/g, ',')
          .trim()
          .replace(/,\s*$/, '')
        : 'Đang cập nhật';

      const startTime = moment(payment.booking.start_time).format('HH:mm [ngày] DD/MM/YYYY');
      const endTime = moment(payment.booking.end_time).format('HH:mm [ngày] DD/MM/YYYY');
      const finalAmountStr = payment.finalAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

      if (rspCode == '00') {
        // --- THÀNH CÔNG ---
        await this.bookingService.updateStatus(bookingId, BookingStatus.COMPLETED);
        await this.updatePayment(payment, PaymentStatus.COMPLETED, transactionNo, bankCode, payDate);

        await this.notificationService.createNotification({
          title: 'Thanh toán thành công',
          content: `Đơn đặt sân ${bookingId} của bạn đã được xác nhận.`,
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
            finalAmount: finalAmountStr,
            bookingId: bookingId,
            frontendUrl: this.vnpayConfiguration.returnUrl?.split('/payment/vnpay_return')[0] ?? '',
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
        // --- THẤT BẠI ---
        await this.bookingService.updateStatus(bookingId, BookingStatus.CANCELLED);
        await this.updatePayment(payment, PaymentStatus.FAILED, transactionNo, bankCode, payDate);

        await this.notificationService.createNotification({
          title: 'Thanh toán thất bại',
          content: `Giao dịch cho đơn ${bookingId} không thành công.`,
          recipientId: payment.booking.userProfile.id,
        });

        if (payment.voucher) {
          await this.voucherRepository.increment({ id: payment.voucher.id }, 'quantity', 1);
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
      this.logger.error(`Lỗi xử lí IPN Booking ${bookingId}`, error);
      return { RspCode: '99', Message: 'Lỗi không xác định' };
    }
  }

  private sortObject(obj: Record<string, string | number | undefined | null>): Record<string, string> {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      const value = obj[key];
      const valueString = value === null || value === undefined ? '' : String(value);
      sorted[key] = encodeURIComponent(valueString).replace(/%20/g, '+');
    });
    return sorted;
  }

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

  async findByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { booking: { id: bookingId } },
      relations: { voucher: true },
    });
  }

  private async sendEmailSafely(mailOptions: { to: string; subject: string; template: string; context: object; }) {
    try {
      await this.mailerService.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Gửi email thất bại đến ${mailOptions.to}:`, error);
    }
  }

  async getStats(startDate?: string, endDate?: string, branchId?: string) {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .leftJoin('payment.booking', 'booking')
      .leftJoin('booking.field', 'field')
      .leftJoin('field.branch', 'branch'); // Join chuẩn theo schema mới

    if (startDate && endDate) {
      query.where('payment.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate });
    }

    if (branchId) {
      query.andWhere('branch.id = :branchId', { branchId });
    }

    // 1. Tổng doanh thu (Chỉ tính đơn COMPLETED)
    const revenue = await query.clone()
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .select('SUM(payment.finalAmount)', 'total')
      .getRawOne<{ total: string | null }>();

    // 2. Số lượng đơn theo trạng thái
    const statusCounts = await query.clone()
      .select('payment.status', 'status')
      .addSelect('COUNT(payment.id)', 'count')
      .groupBy('payment.status')
      .getRawMany<{ status: string; count: string }>();

    const transaction = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = Number(curr.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      revenue: Number(revenue?.total || 0),
      transactions: transaction,
    };
  }

  async getRevenueChart(year: number, branchId?: string) {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .select('MONTH(payment.createdAt)', 'month') // Lưu ý: Hàm MONTH() này dành cho MySQL. Nếu dùng Postgres thì sửa thành EXTRACT(MONTH FROM ...)
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

    const result = await query.getRawMany<{ month: string | number; revenue: string | number }>();

    return result.map(row => ({
      month: Number(row.month),
      revenue: Number(row.revenue),
    }));
  }
}