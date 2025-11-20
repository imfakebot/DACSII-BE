import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeSlot } from './entities/time-slot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeSlot])],
})
export class PricingModule {}
