import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utility } from '@/utility/entities/utility.entity';
import { UtilityService } from './utility.service';
import { UtilityController } from './utility.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Utility]), AuthModule],
  controllers: [UtilityController],
  providers: [UtilityService],
})
export class UtilityModule { }
