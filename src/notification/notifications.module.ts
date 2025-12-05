import { forwardRef, Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entities';
import { UsersModule } from '@/user/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    // Sử dụng forwardRef để phá vỡ circular dependency với UsersModule
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
