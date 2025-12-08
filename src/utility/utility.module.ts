import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utility } from '@/utility/entities/utility.entity';
import { UtilityService } from './utility.service';
import { UtilityController } from './utility.controller';
import { AuthModule } from '@/auth/auth.module';
import { UtilitySale } from './entities/utility-sale.entity';
import { UsersModule } from '@/user/users.module';
import { BookingsModule } from '@/booking/booking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utility, UtilitySale]),
    AuthModule,
    forwardRef(() => UsersModule),
    forwardRef(() => BookingsModule),
  ],
  controllers: [UtilityController],
  providers: [UtilityService],
})
export class UtilityModule {}

