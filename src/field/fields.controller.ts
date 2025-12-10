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
  Query,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { UsersService } from '../user/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFieldDto } from '../field/dto/create-fields.dto';
import { UpdateFieldDto } from '../field/dto/update-fields.dto';
import { AuthenticatedRequest } from '../auth/interface/authenticated-request.interface';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RolesGuard } from '../auth/guards/role.guard';
import { Field } from './entities/field.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilterFieldDto } from './dto/filter-field.dto';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * @controller FieldsController
 * @description Xử lý các yêu cầu liên quan đến quản lý sân bóng (Fields).
 */
@ApiTags('Fields (Sân bóng)')
@Controller('fields')
export class FieldsController {
  private readonly logger = new Logger(FieldsController.name);
  constructor(
    private readonly fieldsService: FieldsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @route POST /fields
   * @description Tạo một sân bóng mới.
   * Cho phép Admin hệ thống hoặc Manager của chi nhánh đó.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager) // Cập nhật: Cho phép cả Manager
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tạo một sân bóng mới (Admin/Manager)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo sân bóng thành công.',
    type: Field,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async create(
    @Body() createFieldDto: CreateFieldDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Field> {
    const userId = req.user.sub;
    this.logger.log(
      `User ${userId} creating field with DTO: ${JSON.stringify(
        createFieldDto,
      )}`,
    );
    const userProfile = await this.usersService.findProfileByAccountId(userId, [
      'account.role',
    ]);

    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    // Logic kiểm tra quyền chi tiết (Branch ownership) nằm trong Service
    return this.fieldsService.create(createFieldDto, userProfile);
  }

  /**
   * @route GET /fields
   * @description Lấy danh sách tất cả các sân bóng (Công khai).
   */
  @Get()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Tìm kiếm sân bóng (Hỗ trợ tìm theo vị trí, tên, chi nhánh)',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  findAll(@Query() filterDto: FilterFieldDto) {
    this.logger.log(
      `Finding all fields with filter: ${JSON.stringify(filterDto)}`,
    );
    return this.fieldsService.findAll(filterDto);
  }

  /**
   * @route GET /fields/:id
   * @description Lấy chi tiết sân bóng (Công khai).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một sân bóng (Công khai)' })
  @ApiResponse({ status: 200, description: 'Thành công.', type: Field })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Field> {
    this.logger.log(`Finding field with id: ${id}`);
    return this.fieldsService.findOne(id);
  }

  /**
   * @route PUT /fields/:id
   * @description Cập nhật thông tin sân bóng.
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cập nhật thông tin sân bóng (Admin/Manager)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công.',
    type: Field,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFieldDto: UpdateFieldDto,
  ): Promise<Field> {
    this.logger.log(
      `Updating field ${id} with DTO: ${JSON.stringify(updateFieldDto)}`,
    );
    // Lưu ý: Nếu cần kiểm tra Manager có được sửa sân này không,
    // cần truyền thêm UserProfile vào hàm update trong Service tương tự như hàm create.
    return this.fieldsService.update(id, updateFieldDto);
  }

  /**
   * @route DELETE /fields/:id
   * @description Xóa sân bóng (Soft delete).
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager) // Cho phép Manager xóa
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa một sân bóng (Xóa mềm)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    this.logger.log(`Removing field with id: ${id}`);
    return this.fieldsService.remove(id);
  }

  /**
   * @route POST /fields/:id/images
   * @description Tải ảnh sân bóng.
   */
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tải lên hình ảnh cho một sân bóng' })
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiResponse({ status: 201, description: 'Tải ảnh lên thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sân bóng.' })
  uploadImages(
    @Param('id') fieldId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    this.logger.log(`Uploading ${files.length} images for field ${fieldId}`);
    return this.fieldsService.addImagesToField(fieldId, files);
  }
}
