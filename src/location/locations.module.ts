import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Address } from './entities/address.entity';
import { Ward } from './entities/ward.entity';
import { City } from './entities/city.entity';
import { HttpModule } from '@nestjs/axios';
import { GeocodingService } from './geocoding.service';

/**
 * @module LocationModule
 * @description Module quản lý các chức năng liên quan đến địa điểm (Tỉnh/Thành, Phường/Xã, Địa chỉ) và geocoding.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Address, Ward, City]), HttpModule],
  controllers: [LocationsController],
  providers: [LocationsService, GeocodingService],
  exports: [LocationsService, GeocodingService, TypeOrmModule],
})
export class LocationModule {}
