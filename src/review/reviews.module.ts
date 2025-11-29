import { Module } from '@nestjs/common';
import { Review } from './entities/review.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { BookingsModule } from '@/booking/booking.module';
import { UsersModule } from '@/user/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    BookingsModule, // Import BookingsModule để có thể inject BookingService
    UsersModule, // Import UsersModule để có thể inject UsersService trong controller
  ],
  providers: [ReviewService],
  controllers: [ReviewController],
})
export class ReviewsModule {}
