import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeSlot } from './entities/time-slot.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { Booking } from '@/booking/entities/booking.entity';
import { Field } from '@/fields/entities/field.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeSlot, Field, Booking])],
  providers: [PricingService],
  controllers: [PricingController],
  exports: [PricingService],
})
export class PricingModule {}
