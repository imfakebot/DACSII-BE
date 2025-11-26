import { Module } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Field } from './entities/field.entity';
import { FieldType } from './entities/field-types.entity';
import { LocationModule } from '@/locations/locations.module';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';
import { FieldImage } from './entities/field-image.entity';
import { Utility } from './entities/utility.entity';

/**
 * @module FieldsModule
 * @description
 * Module này đóng gói tất cả các chức năng liên quan đến quản lý sân bóng.
 * Nó bao gồm các controllers, services, và entities cần thiết để thực hiện các thao tác CRUD
 * và các logic nghiệp vụ khác liên quan đến sân bóng, loại sân, hình ảnh, và tiện ích.
 */
@Module({
  imports: [
    // Đăng ký các entities liên quan đến sân bóng với TypeORM.
    TypeOrmModule.forFeature([Field, FieldType, FieldImage, Utility]),
    // Import LocationModule để có thể sử dụng các service/entity liên quan đến địa chỉ.
    LocationModule,
    // Import AuthModule để sử dụng các Guards (JwtAuthGuard, RolesGuard) trong FieldsController.
    AuthModule,
    // Import UsersModule để có thể truy cập UsersService, cần thiết để lấy thông tin chủ sân (owner).
    UsersModule,
  ],
  // Cung cấp FieldsService để xử lý logic nghiệp vụ.
  providers: [FieldsService],
  // Đăng ký FieldsController để xử lý các request HTTP.
  controllers: [FieldsController],
  // Export FieldsService để các module khác (ví dụ: BookingsModule) có thể sử dụng.
  exports: [FieldsService],
})
export class FieldsModule {}
