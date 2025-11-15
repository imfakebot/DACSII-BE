import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from '../auth/strategies/google.strategy';
import googleOauthConfig from './config/google-oauth.config'; // Corrected path
import { LocalAuthGuard } from './guards/local-auth-guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';



@Module({
  imports: [
    UsersModule,
    PassportModule, // Không cần .register({ session: true }) nếu không dùng session
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService], // Sửa từ ConfigModule sang ConfigService
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1w' }, 
      }),
    }),
    ConfigModule.forFeature(googleOauthConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    LocalAuthGuard,
    GoogleAuthGuard,
  ],
})
export class AuthModule { }
