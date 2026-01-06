import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldType } from './entities/field-types.entity';
import { CreateFieldTypeDto } from './dto/create-field-type.dto';
import { UpdateFieldTypeDto } from './dto/update-field-type.dto';

@Injectable()
export class FieldTypeService {
  private readonly logger = new Logger(FieldTypeService.name);

  constructor(
    @InjectRepository(FieldType)
    private readonly fieldTypeRepository: Repository<FieldType>,
  ) {}

  async create(createFieldTypeDto: CreateFieldTypeDto): Promise<FieldType> {
    this.logger.log(`Creating new field type: ${JSON.stringify(createFieldTypeDto)}`);
    
    const existing = await this.fieldTypeRepository.findOne({ where: { name: createFieldTypeDto.name } });
    if (existing) {
        throw new ConflictException('Loại sân này đã tồn tại.');
    }

    const newFieldType = this.fieldTypeRepository.create(createFieldTypeDto);
    return this.fieldTypeRepository.save(newFieldType);
  }

  async findAll(): Promise<FieldType[]> {
    this.logger.log('Fetching all field types from database');
    return this.fieldTypeRepository.find();
  }

  async findOne(id: string): Promise<FieldType> {
    const fieldType = await this.fieldTypeRepository.findOne({ where: { id } });
    if (!fieldType) {
      throw new NotFoundException(`Không tìm thấy loại sân với ID ${id}`);
    }
    return fieldType;
  }

  async update(id: string, updateFieldTypeDto: UpdateFieldTypeDto): Promise<FieldType> {
    this.logger.log(`Updating field type ${id}`);
    const fieldType = await this.findOne(id);
    
    if (updateFieldTypeDto.name && updateFieldTypeDto.name !== fieldType.name) {
        const existing = await this.fieldTypeRepository.findOne({ where: { name: updateFieldTypeDto.name } });
        if (existing) {
            throw new ConflictException('Tên loại sân đã tồn tại.');
        }
    }

    Object.assign(fieldType, updateFieldTypeDto);
    return this.fieldTypeRepository.save(fieldType);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting field type ${id}`);
    const result = await this.fieldTypeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy loại sân với ID ${id}`);
    }
  }
}
