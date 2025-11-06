import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true
  }), DatabaseModule, AuthModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
