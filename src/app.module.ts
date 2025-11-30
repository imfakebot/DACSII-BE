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
      load: [vnpayConfig, googleOauthConfig],
    }),

    // Cấu hình module gửi email một cách bất đồng bộ.
    // Cấu hình được lấy từ `ConfigService` sau khi `ConfigModule` đã được nạp.
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('MAIL_HOST');
        const user = configService.get<string>('MAIL_USER');
        const pass = configService.get<string>('MAIL_PASS');
        const from = configService.get<string>('MAIL_FROM');
        const portRaw = configService.get<string>('MAIL_PORT');
        const secureRaw = configService.get<string>('MAIL_SECURE');
        const port = portRaw ? Number(portRaw) : 587;
        // Nếu không khai báo MAIL_SECURE thì tự động chọn secure=true cho port 465 (Implicit TLS),
        // còn lại (ví dụ 587) dùng STARTTLS (secure=false) và nâng cấp sau.
        const implicitTLS = port === 465;
        const secure = secureRaw ? secureRaw === 'true' : implicitTLS;

        let transport: any;
        if (!host || !user || !pass) {
          // Fallback tạo tài khoản test Ethereal khi thiếu biến môi trường (chỉ dev)
          // eslint-disable-next-line no-console
          console.warn('[Mailer] Missing MAIL_* env vars – creating Ethereal test account');
          const testAccount = await nodemailer.createTestAccount();
          transport = {
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          };
          // eslint-disable-next-line no-console
          console.warn(`[Mailer] Ethereal account created. Web URL: ${testAccount.web}`);
        } else {
          transport = {
            host,
            port,
            secure,
            auth: { user, pass },
            // Với STARTTLS (secure=false) ép yêu cầu nâng cấp TLS để tránh downgrade.
            ...(secure ? {} : { requireTLS: true }),
          };
        }

        return {
          transport,
          defaults: {
            from: `"No Reply" <${from || user || 'no-reply@example.com'}>`,
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get<string>('MAIL_FROM')}>`, // Email người gửi mặc định
        },
        template: {
          dir: join(process.cwd(), 'src', 'templates'), // Sửa lại đường dẫn ở đây
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
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
export class AppModule { }
