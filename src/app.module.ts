import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { FieldsModule } from './field/fields.module';
import { BookingsModule } from './booking/booking.module';
import { PricingModule } from './pricing/pricing.module';
import { PaymentsModule } from './payment/payments.module';
import { VouchersModule } from './voucher/vouchers.module';
import { ReviewsModule } from './review/reviews.module';
import { NotificationsModule } from './notification/notifications.module';
import { FeedbacksModule } from './feedback/feedbacks.module';
import { LocationModule } from './location/locations.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import vnpayConfig from './payment/config/vnpay.config';
import googleOauthConfig from './auth/config/google-oauth.config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ScheduleModule } from '@nestjs/schedule';
import { EventModule } from './event/event.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

/**
 * @module AppModule
 * @description Module gốc của ứng dụng NestJS.
 * Module này chịu trách nhiệm import và cấu hình tất cả các module tính năng khác,
 * cũng như các module cấu hình toàn cục như `ConfigModule` và `MailerModule`.
 */
@Module({
  imports: [
    /**
     * @description
     * Cấu hình module quản lý biến môi trường từ file `.env`.
     * `isGlobal: true` cho phép truy cập `ConfigService` từ bất kỳ module nào.
     * `load` đăng ký các tệp cấu hình tùy chỉnh (ví dụ: cho VNPay, Google OAuth).
     */
    ConfigModule.forRoot({
      isGlobal: true,
      load: [vnpayConfig, googleOauthConfig],
    }),

    /**
     * @description
     * Cấu hình module gửi email (MailerModule) một cách bất đồng bộ.
     * Cấu hình được lấy từ `ConfigService` sau khi `ConfigModule` đã được nạp.
     */
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          secure: false,
          auth: {
            user: configService.get<string>('MAIL_USER'), // Tài khoản email
            pass: configService.get<string>('MAIL_PASS'), // Mật khẩu email
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get<string>('MAIL_FROM')}>`, // Email người gửi mặc định
        },
        template: {
          dir: join(__dirname, '..', 'templates'), // Đường dẫn đến thư mục chứa các mẫu email Handlebars.
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),

    /**
     * @description
     * Cấu hình MulterModule để xử lý việc tải lên tệp (file uploads).
     * - `storage`: Sử dụng `diskStorage` để lưu file vào thư mục `./uploads`.
     * - `limits`: Giới hạn kích thước file.
     * - `fileFilter`: Chỉ cho phép các định dạng file ảnh phổ biến.
     */
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const extension = extname(file.originalname);
            const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
            callback(null, filename);
          },
        }),

        limits: {
          fileSize: 5 * 1024 * 1024, // Giới hạn kích thước file tối đa 5MB
        },

        fileFilter: (req, file, callback) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return callback(new Error('Only image files are allowed!'), false);
          }
          callback(null, true);
        },
      }),
    }),

    /**
     * @description
     * Cấu hình ServeStaticModule để phục vụ các tệp tĩnh từ thư mục 'uploads'.
     * Các tệp trong thư mục này sẽ có thể truy cập được qua đường dẫn `/uploads`.
     */
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    /**
     * @description Các module tính năng của ứng dụng.
     * Mỗi module đóng gói một tập hợp các chức năng liên quan (controllers, services, entities).
     */
    // Module quản lý kết nối cơ sở dữ liệu.
    DatabaseModule,

    // Module quản lý xác thực (authentication) và phân quyền (authorization).
    AuthModule,

    // Module quản lý thông tin người dùng.
    UsersModule,

    // Module quản lý các địa điểm, vị trí.
    LocationModule,

    // Module quản lý thông tin các sân bóng.
    FieldsModule,

    // Module quản lý việc đặt sân.
    BookingsModule,

    // Module quản lý giá cả.
    PricingModule,

    // Module quản lý các giao dịch thanh toán.
    PaymentsModule,

    // Module quản lý mã giảm giá (vouchers).
    VouchersModule,

    // Module quản lý các bài đánh giá.
    ReviewsModule,

    // Module quản lý hệ thống thông báo.
    NotificationsModule,

    // Module quản lý các phản hồi từ người dùng.
    FeedbacksModule,

    /**
     * @description
     * Cấu hình ScheduleModule để chạy các tác vụ định kỳ (cron jobs).
     * Cần thiết cho các công việc tự động như kiểm tra trạng thái đặt sân, gửi thông báo,...
     */
    ScheduleModule.forRoot(),

    /**
     * @description
     * Module quản lý giao tiếp thời gian thực qua WebSocket (Socket.IO).
     * Được đánh dấu là Global để có thể inject `EventGateway` ở mọi nơi.
     */
    EventModule,

    /**
     * @description
     * Cấu hình ThrottlerModule để giới hạn số lượng request (rate limiting) nhằm chống lại các cuộc tấn công brute-force.
     * `ttl`: Time-to-live (thời gian sống của một cửa sổ) tính bằng giây.
     * `limit`: Số lượng request tối đa trong một cửa sổ `ttl`.
     */
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 phút
        limit: 10, // 10 requests
      },
    ]),
  ],
  controllers: [],
  providers: [
    // Áp dụng ThrottlerGuard cho toàn bộ ứng dụng như một guard toàn cục.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
