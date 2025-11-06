import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocationModule } from './locations/locations.module';
import { FieldsModule } from './fields/fields.module';
import { BookingsModule } from './bookings/bookings.module';
import { PricingModule } from './pricing/pricing.module';
import { PaymentsModule } from './payments/payments.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }), DatabaseModule, AuthModule, UsersModule, LocationModule, FieldsModule, BookingsModule, PricingModule, PaymentsModule, VouchersModule, ReviewsModule, NotificationsModule, FeedbacksModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
