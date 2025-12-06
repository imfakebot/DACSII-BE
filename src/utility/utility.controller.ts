import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UtilityService } from './utility.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Role } from '@/auth/enums/role.enum';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Utility } from '@/utility/entities/utility.entity';

@ApiTags('Utilities (Tiện ích sân bóng)')
@Controller('utilities')
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Tạo một tiện ích mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo tiện ích thành công.',
    type: Utility,
  })
  create(@Body() createUtilityDto: CreateUtilityDto) {
    return this.utilityService.create(createUtilityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả tiện ích' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các tiện ích.',
    type: [Utility],
  })
  findAll() {
    return this.utilityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một tiện ích' })
  @ApiResponse({ status: 200, description: 'Chi tiết tiện ích.', type: Utility })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.utilityService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Cập nhật một tiện ích' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công.',
    type: Utility,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUtilityDto: UpdateUtilityDto,
  ) {
    return this.utilityService.update(id, updateUtilityDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '(Admin) Xoá một tiện ích' })
  @ApiResponse({ status: 200, description: 'Xoá thành công.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.utilityService.remove(id);
  }
}
