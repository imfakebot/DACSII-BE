import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';
import { VoucherCollection } from './entities/voucher-collection.entity';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { Booking } from '@/booking/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherUsage, VoucherCollection, Booking]),
  ],
  providers: [VoucherService],
  controllers: [VoucherController],
  exports: [VoucherService],
})
export class VouchersModule {}
