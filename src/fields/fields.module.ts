import { Module } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fields } from './entities/field.entity'
import { FieldTypes } from './entities/field-types.entity';
import { LocationModule } from '@/locations/locations.module';


@Module({
	imports: [
		TypeOrmModule.forFeature([Fields, FieldTypes]),
		LocationModule
	],
	providers: [FieldsService],
	controllers: [FieldsController],
	exports: [FieldsService]
})
export class FieldsModule { }
