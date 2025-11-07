import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { Auth\Service } from './auth/.service';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [Auth\Service, AuthService]
})
export class AuthModule {}
