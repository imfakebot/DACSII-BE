import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy'; // Đường dẫn đến LocalStrategy
import { JwtStrategy } from './strategies/jwt.strategy'; // Đường dẫn đến JwtStrategy

@Module({
  imports: [
    UsersModule,
    PassportModule, // Không cần .register({ session: true }) nếu không dùng session
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService], // Sửa từ ConfigModule sang ConfigService
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1w' }, // 'HS256' là mặc định, có thể bỏ
      }),
    })],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy]
})
export class AuthModule { }
