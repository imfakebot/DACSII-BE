import { Global, Module } from '@nestjs/common';
import { EventGateway } from './event.gateway';

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
  providers: [EventGateway],
  exports: [EventGateway],
})
export class EventModule {}
