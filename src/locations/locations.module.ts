import { Module,  } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Address } from './entities/address.entity';
import { Ward } from './entities/ward.entity';
import { City } from './entities/city.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address, Ward, City]),
   
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService, TypeOrmModule]
})
export class LocationModule { }
