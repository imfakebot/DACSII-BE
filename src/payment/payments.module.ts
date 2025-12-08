import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { BookingsModule } from '@/booking/booking.module';
import { VouchersModule } from '@/voucher/vouchers.module';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { PricingModule } from '@/pricing/pricing.module';
import { NotificationsModule } from '@/notification/notifications.module';

/**
 * @module PaymentsModule
 * @description Module quản lý các chức năng liên quan đến thanh toán và thống kê.
 * - Đăng ký các entity `Payment` và `Voucher`.
 * - Tích hợp với `BookingsModule` để cập nhật trạng thái đơn hàng.
 * - Tích hợp với `NotificationsModule` để gửi thông báo sau khi thanh toán.
 * - Cung cấp `PaymentController` và `PaymentService` để xử lý logic.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Voucher]),
    forwardRef(() => BookingsModule),
    VouchersModule,
    PricingModule,
    NotificationsModule, // Import NotificationsModule để có thể inject NotificationService
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentsModule {}
