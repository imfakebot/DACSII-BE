import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FieldTypeService } from './field-type.service';
import { FieldType } from './entities/field-types.entity';

@ApiTags('Field Types (Loại Sân)')
@Controller('field-types')
export class FieldTypeController {
  private readonly logger = new Logger(FieldTypeController.name);

  constructor(private readonly fieldTypeService: FieldTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các loại sân bóng' })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách các loại sân bóng.',
    type: [FieldType],
  })
  async findAll(): Promise<FieldType[]> {
    this.logger.log('Fetching all field types');
    return this.fieldTypeService.findAll();
  }
}
