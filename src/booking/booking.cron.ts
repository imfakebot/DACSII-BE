import { Injectable, Logger } from '@nestjs/common';
import { Booking } from './entities/booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { Payment } from '@/payment/entities/payment.entity';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from './enums/booking-status.enum';

@Injectable()
export class BookingCronService {
  private readonly logger = new Logger(BookingCronService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly PaymentRepository: Repository<Payment>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for expired pending bookings...');


    // Tìm các đơn PENDING tạo trước timeLimit
    const expiredBookings = await this.bookingRepository.find({
      where: {
        status: BookingStatus.PENDING,
        createdAt: Raw((alias) => `${alias} < NOW() - INTERVAL 30 MINUTE`),
      },
      relations: ['payment', 'payment.voucher'],
    });

    if (expiredBookings.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${expiredBookings.length} expired bookings. Cancelling...`,
    );

    for (const booking of expiredBookings) {
      try {
        booking.status = BookingStatus.CANCELLED;
        await this.bookingRepository.save(booking);

        if (booking.payment?.voucher) {
          await this.voucherRepository.increment(
            {
              id: booking.payment.voucher.id,
            },
            'quantity',
            1,
          );
          this.logger.log(`Refunded voucher for expired booking ${booking.id}`);
        } else {
          this.logger.log(`No voucher found for expired booking ${booking.id}`);
        }
        this.logger.log(`Auto-cancelled booking ${booking.id}`);
      } catch (error) {
        this.logger.error(`Error cancelling booking ${booking.id}: `, error);
      }
    }
  }
}
