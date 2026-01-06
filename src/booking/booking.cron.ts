import { Injectable, Logger } from '@nestjs/common';
import { Booking } from './entities/booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Raw, Repository } from 'typeorm';
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

  /**
   * Job này chạy mỗi phút để tự động hủy các đơn PENDING quá hạn thanh toán.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for expired pending bookings...');

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

  /**
   * Job này chạy mỗi giờ để hoàn thành các đơn đã check-in và đã qua giờ chơi.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleFinishedBookings() {
    this.logger.debug('Checking for finished bookings...');

    const now = new Date();
    const finishedBookings = await this.bookingRepository.find({
      where: {
        status: BookingStatus.CHECKED_IN,
        end_time: LessThan(now),
      },
    });

    if (finishedBookings.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${finishedBookings.length} finished bookings. Updating status...`,
    );

    for (const booking of finishedBookings) {
      try {
        // Update status to FINISHED
        booking.status = BookingStatus.FINISHED;
        await this.bookingRepository.save(booking);
        this.logger.log(`Updated booking ${booking.id} to FINISHED.`);
      } catch (error) {
        this.logger.error(
          `Error processing finished booking ${booking.id}: `,
          error,
        );
      }
    }
  }
}
