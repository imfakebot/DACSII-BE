import { forwardRef, Global, Module } from '@nestjs/common';
import { EventGateway } from './event.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@/user/users.module'; // <--- Import UsersModule
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * @module EventModule
 * @description
 * Module này quản lý WebSocket gateway (`EventGateway`) để giao tiếp thời gian thực.
 * Nó được đánh dấu là `@Global()` để `EventGateway` có thể được inject
 * và sử dụng ở bất kỳ module nào khác trong ứng dụng mà không cần import `EventModule`.
 * Điều này rất hữu ích để các service khác (ví dụ: BookingService) có thể gửi thông báo
 * đến client một cách dễ dàng.
 */
@Global()
@Module({
  imports: [
    // Sử dụng forwardRef để phá vỡ các chuỗi phụ thuộc vòng tiềm ẩn
    // do EventModule là global và import một module khác.
    forwardRef(() => UsersModule),
    // Đăng ký JwtModule để dùng trong Gateway
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [EventGateway],
  exports: [EventGateway],
})
export class EventModule { }
