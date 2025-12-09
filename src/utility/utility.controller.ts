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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Role } from '@/auth/enums/role.enum';
import { Roles } from '@/auth/decorator/roles.decorator';
import { Utility } from '@/utility/entities/utility.entity';

/**
 * @controller UtilityController
 * @description Xử lý các yêu cầu HTTP liên quan đến quản lý tiện ích và các sản phẩm bán tại sân.
 * Bao gồm các thao tác CRUD cho tiện ích, ghi nhận doanh thu và thống kê.
 */
@ApiTags('Utilities (Tiện ích & Sản phẩm)')
@Controller('utilities')
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) { }

  /**
   * @route POST /utilities
   * @description (Admin) Tạo một tiện ích hoặc sản phẩm mới.
   * @param {CreateUtilityDto} createUtilityDto - DTO chứa thông tin để tạo mới.
   * @returns {Promise<Utility>} - Tiện ích vừa được tạo.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Tạo một tiện ích/sản phẩm mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo tiện ích thành công.',
    type: Utility,
  })
  create(@Body() createUtilityDto: CreateUtilityDto) {
    return this.utilityService.create(createUtilityDto);
  }

  /**
   * @route GET /utilities
   * @description (Public) Lấy danh sách tất cả các tiện ích và sản phẩm có trong hệ thống.
   * @returns {Promise<Utility[]>} - Mảng các tiện ích.
   */
  @Get()
  @ApiOperation({ summary: '(Public) Lấy danh sách tất cả tiện ích' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các tiện ích.',
    type: [Utility],
  })
  findAll() {
    return this.utilityService.findAll();
  }

  /**
   * @route GET /utilities/:id
   * @description (Public) Lấy thông tin chi tiết của một tiện ích/sản phẩm bằng ID.
   * @param {number} id - ID của tiện ích.
   * @returns {Promise<Utility>} - Chi tiết tiện ích.
   */
  @Get(':id')
  @ApiOperation({ summary: '(Public) Lấy thông tin chi tiết một tiện ích' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết tiện ích.',
    type: Utility,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.utilityService.findOne(id);
  }

  /**
   * @route PUT /utilities/:id
   * @description (Admin) Cập nhật thông tin của một tiện ích/sản phẩm.
   * @param {number} id - ID của tiện ích cần cập nhật.
   * @param {UpdateUtilityDto} updateUtilityDto - DTO chứa thông tin cập nhật.
   * @returns {Promise<Utility>} - Tiện ích sau khi đã cập nhật.
   */
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

  /**
   * @route DELETE /utilities/:id
   * @description (Admin) Xóa một tiện ích/sản phẩm khỏi hệ thống.
   * @param {number} id - ID của tiện ích cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa.
   */
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
