import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('API document')
    .setDescription('API')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Nhập JWT Access Token',
      in: 'header',
    })
    .addCookieAuth(
      'refresh_token',
      {
        type: 'http',
        in: 'Header', // Mặc dù là cookie, Swagger UI sẽ gửi qua header
        scheme: 'Bearer',
      },
      'cookie_auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document);

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // Monkey patch MailerService logger để đổi cấp log của thông điệp sai lệch
  try {
    const mailer = app.get(MailerService);
    const originalError = (mailer as any).logger?.error?.bind((mailer as any).logger);
    if (originalError) {
      (mailer as any).logger.error = (message: any, ...rest: any[]) => {
        if (typeof message === 'string' && message.includes('Transporter is ready')) {
          // Hạ cấp thành log thường
          console.log('[MailerService]', message);
          return;
        }
        originalError(message, ...rest);
      };
    }
  } catch (e) {
    // Không làm gì nếu không lấy được service
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
