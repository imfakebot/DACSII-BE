import { forwardRef, Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackResponse } from './entities/feedback-response.entity';
import { UsersModule } from '@/user/users.module';

/**
 * @module FeedbacksModule
 * @description Module quản lý các chức năng liên quan đến feedback và hỗ trợ khách hàng.
 * Bao gồm controller, service và các entity cho feedback và các phản hồi.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback, FeedbackResponse]),
    // Sử dụng forwardRef để phá vỡ circular dependency tiềm ẩn
    // FeedbackService -> EventGateway -> UsersService
    forwardRef(() => UsersModule),
  ],
  providers: [FeedbackService],
  controllers: [FeedbackController],
})
export class FeedbacksModule {}
