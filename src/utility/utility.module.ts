import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utility } from '@/utility/entities/utility.entity';
import { UtilityService } from './utility.service';
import { UtilityController } from './utility.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utility]),
  ],
  controllers: [UtilityController],
  providers: [UtilityService],
})
export class UtilityModule { }
