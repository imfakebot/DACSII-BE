import { PartialType } from '@nestjs/swagger';
import { CreateFieldTypeDto } from './create-field-type.dto';

export class UpdateFieldTypeDto extends PartialType(CreateFieldTypeDto) { }