import { Module } from '@nestjs/common';

/**
 * @module BranchModule
 * @description Module quản lý các chi nhánh sân bóng.
 * Hiện tại module này chỉ chứa entity và sẽ được các module khác (như Fields, Users) import và sử dụng.
 * Tương lai có thể mở rộng để có service và controller riêng cho việc quản lý chi nhánh.
 */
@Module({})
export class BranchModule {}
