import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Field } from '../field/entities/field.entity';
import { UsersModule } from '@/user/users.module';
import { PricingModule } from '@/pricing/pricing.module';
import { VouchersModule } from '@/voucher/vouchers.module';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { Payment } from '@/payment/entities/payment.entity';
import { PaymentsModule } from '@/payment/payments.module';
import { BookingCronService } from './booking.cron';
/**
 * @module BookingsModule
 * @description
 * Module này quản lý tất cả các chức năng liên quan đến việc đặt sân,
 * bao gồm tạo, xem, cập nhật và xóa các lượt đặt sân.
 * Nó đăng ký `Booking` entity với TypeORM để tương tác với cơ sở dữ liệu.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Field, Voucher, Payment]),
    PricingModule,
    UsersModule,
    VouchersModule,
    forwardRef(() => PaymentsModule),
  ],
  providers: [BookingService, BookingCronService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingsModule { }
