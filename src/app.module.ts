import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { FieldsModule } from './fields/fields.module';
import { BookingsModule } from './bookings/bookings.module';
import { PricingModule } from './pricing/pricing.module';
import { PaymentsModule } from './payments/payments.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { LocationModule } from './locations/locations.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';

/**
 * @module AppModule
 * @description
 * Module gốc của ứng dụng NestJS.
 * Module này chịu trách nhiệm import và cấu hình tất cả các module tính năng khác,
 * cũng như các module cấu hình toàn cục như `ConfigModule` và `MailerModule`.
 */
@Module({
  imports: [
    // Cấu hình module quản lý biến môi trường.
    // `isGlobal: true` giúp các service của ConfigModule có thể được inject ở bất kỳ đâu trong ứng dụng.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Cấu hình module gửi email một cách bất đồng bộ.
    // Cấu hình được lấy từ `ConfigService` sau khi `ConfigModule` đã được nạp.
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
      }),
      inject: [ConfigService],
    }),

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

        litmits: {
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

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
