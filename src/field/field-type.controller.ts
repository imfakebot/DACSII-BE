import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FieldTypeService } from './field-type.service';
import { FieldType } from './entities/field-types.entity';
import { CreateFieldTypeDto } from './dto/create-field-type.dto';
import { UpdateFieldTypeDto } from './dto/update-field-type.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';

@ApiTags('Field Types (Loại Sân)')
@Controller('field-types')
export class FieldTypeController {
  private readonly logger = new Logger(FieldTypeController.name);

  constructor(private readonly fieldTypeService: FieldTypeService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Tạo loại sân mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công.', type: FieldType })
  create(@Body() createFieldTypeDto: CreateFieldTypeDto) {
    return this.fieldTypeService.create(createFieldTypeDto);
  }

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

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết loại sân' })
  @ApiResponse({ status: 200, description: 'Trả về chi tiết loại sân.', type: FieldType })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fieldTypeService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Cập nhật loại sân' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.', type: FieldType })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateFieldTypeDto: UpdateFieldTypeDto) {
    return this.fieldTypeService.update(id, updateFieldTypeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Xóa loại sân' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fieldTypeService.remove(id);
  }
}
