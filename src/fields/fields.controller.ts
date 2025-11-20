import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFieldDto } from '../fields/dto/create-fields.dto';
import { UpdateFieldDto } from '../fields/dto/update-fields.dto';
import { AuthenticatedRequest } from '../auth/auth.controller';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RolesGuard } from '../auth/guards/role.guard';
import { Field } from './entities/field.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
/**
 * @controller FieldsController
 * @description Xử lý các yêu cầu liên quan đến quản lý sân bóng (Fields).
 * Bao gồm các hoạt động CRUD (Tạo, Đọc, Cập nhật, Xóa) cho sân bóng.
 * Các hoạt động tạo, cập nhật, xóa yêu cầu quyền Admin.
 */
@ApiTags('Fields (Sân bóng)')
@Controller('fields')
export class FieldsController {
  /**
   * @param {FieldsService} fieldsService - Service xử lý logic nghiệp vụ cho sân bóng.
   * @param {UsersService} usersService - Service để truy xuất thông tin người dùng (cụ thể là Admin).
   */
  constructor(
    private readonly fieldsService: FieldsService,
    private readonly usersService: UsersService,
  ) { }

  /**
   * @route POST /fields
   * @description (Admin) Tạo một sân bóng mới.
   * @param {CreateFieldDto} createFieldDto - DTO chứa thông tin để tạo sân bóng mới.
   * @param {AuthenticatedRequest} req - Request đã được xác thực, chứa thông tin admin.
   * @returns {Promise<Field>} - Sân bóng vừa được tạo.
   * @throws {NotFoundException} - Nếu không tìm thấy hồ sơ của admin.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin) // Chỉ Admin mới có quyền tạo sân bóng
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Tạo một sân bóng mới' })
  @ApiResponse({ status: 201, description: 'Tạo sân bóng thành công.', type: Field })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource. (Không phải Admin)' })
  async create(
    @Body() createFieldDto: CreateFieldDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const adminAccountId = req.user.sub;
    const adminProfile = await this.usersService.findProfileByAccountId(adminAccountId);
    if (!adminProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ của Admin.');
    }
    return this.fieldsService.create(createFieldDto, adminProfile);
  }

  /**
   * @route GET /fields
   * @description Lấy danh sách tất cả các sân bóng. Endpoint này công khai cho mọi người dùng.
   * @returns {Promise<Field[]>} - Danh sách các sân bóng.
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả sân bóng (Công khai)' })
  @ApiResponse({ status: 200, description: 'Thành công.', type: [Field] })
  findAll() {
    return this.fieldsService.findAll();
  }

  /**
   * @route GET /fields/:id
   * @description Lấy thông tin chi tiết của một sân bóng dựa vào ID. Endpoint này công khai.
   * @param {string} id - ID của sân bóng (UUID).
   * @returns {Promise<Field>} - Thông tin chi tiết của sân bóng.
   * @throws {NotFoundException} - Nếu không tìm thấy sân bóng với ID tương ứng.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một sân bóng (Công khai)' })
  @ApiResponse({ status: 200, description: 'Thành công.', type: Field })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fieldsService.findOne(id);
  }

  /**
   * @route PUT /fields/:id
   * @description (Admin) Cập nhật thông tin của một sân bóng.
   * @param {string} id - ID của sân bóng cần cập nhật.
   * @param {UpdateFieldDto} updateFieldDto - DTO chứa thông tin cập nhật.
   * @returns {Promise<Field>} - Sân bóng sau khi đã được cập nhật.
   * @throws {NotFoundException} - Nếu không tìm thấy sân bóng.
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin) // Chỉ Admin mới có quyền cập nhật
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Cập nhật thông tin sân bóng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.', type: Field })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFieldDto: UpdateFieldDto,
  ) {
    return this.fieldsService.update(id, updateFieldDto);
  }

  /**
   * @route DELETE /fields/:id
   * @description (Admin) Xóa một sân bóng (xóa mềm - soft delete).
   * @param {string} id - ID của sân bóng cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa thành công.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin) // Chỉ Admin mới có quyền xóa
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK) // Thay vì 204 No Content, trả về 200 OK với message
  @ApiOperation({ summary: '(Admin) Xóa một sân bóng (Xóa mềm)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fieldsService.remove(id);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard) // Bảo vệ endpoint
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tải lên hình ảnh cho một sân bóng' })
  @UseInterceptors(FilesInterceptor('images', 10)) // 'images' là tên field, 10 là số file tối đa
  uploadImages(
    @Param('id') fieldId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    // Gọi đến một phương thức mới trong FieldsService
    return this.fieldsService.addImagesToField(fieldId, files);
  }
}