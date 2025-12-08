import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';

/**
 * @module BranchModule
 * @description Module quản lý các chi nhánh sân bóng.
 * Đăng ký `Branch` entity với TypeORM và cung cấp repository cho các module khác.
 * Tương lai có thể mở rộng để có service và controller riêng cho việc quản lý chi nhánh.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  exports: [TypeOrmModule],
})
export class BranchModule {}
