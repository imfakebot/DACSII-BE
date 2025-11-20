import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
/**
 * @module BookingsModule
 * @description
 * Module này quản lý tất cả các chức năng liên quan đến việc đặt sân,
 * bao gồm tạo, xem, cập nhật và xóa các lượt đặt sân.
 * Nó đăng ký `Booking` entity với TypeORM để tương tác với cơ sở dữ liệu.
 */
@Module({
  imports: [
    // Đăng ký Booking entity với TypeORM.
    // Điều này cho phép inject BookingRepository vào các service trong module này.
    TypeOrmModule.forFeature([Booking]),
  ],
})
export class BookingsModule {}
