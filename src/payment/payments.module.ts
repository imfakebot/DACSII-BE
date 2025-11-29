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
