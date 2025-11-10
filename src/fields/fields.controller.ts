import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { FieldsService } from './fields.service';

@Controller('api/fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  async findAll() {
    return this.fieldsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const f = await this.fieldsService.findOne(id);
    if (!f) throw new NotFoundException('Field not found');
    return f;
  }
}
