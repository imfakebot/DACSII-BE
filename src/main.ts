import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/http-exception.filter';

/**
 * @async
 * @function bootstrap - Hàm khởi tạo và cấu hình ứng dụng NestJS.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true, // Nếu gặp 1 lỗi thì báo luôn, không cần check hết các trường khác
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
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
