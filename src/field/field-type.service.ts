import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldType } from './entities/field-types.entity';

@Injectable()
export class FieldTypeService {
  private readonly logger = new Logger(FieldTypeService.name);

  constructor(
    @InjectRepository(FieldType)
    private readonly fieldTypeRepository: Repository<FieldType>,
  ) {}

  async findAll(): Promise<FieldType[]> {
    this.logger.log('Fetching all field types from database');
    return this.fieldTypeRepository.find();
  }
}
