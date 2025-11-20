import { Module } from '@nestjs/common';
import { Review } from './entities/review.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forFeature([Review])
    ]
})
export class ReviewsModule { }
