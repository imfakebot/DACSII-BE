import { Module } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';

@Module({
	providers: [FieldsService],
	controllers: [FieldsController],
	exports: [FieldsService]
})
export class FieldsModule {}
