import {
  Controller,
  Get,
  UseGuards,
  Put,
  Body,
  Query,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/auth/decorator/users.decorator';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { Roles } from '@/auth/decorator/roles.decorator';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Role } from '../auth/enums/role.enum';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';

/**
 * @controller UsersController
 * @description Xử lý các yêu cầu liên quan đến thông tin người dùng.
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  /**
   * @constructor
   * @param {UsersService} usersService - Service xử lý logic nghiệp vụ liên quan đến người dùng.
   */
  constructor(private readonly usersService: UsersService) { }

  /**
   * @route GET /users/me
   * @description Lấy thông tin chi tiết của tài khoản và hồ sơ của người dùng đang đăng nhập.
   * @param {string} accountID - ID của tài khoản, được trích xuất từ JWT payload bởi decorator `@User`.
   * @returns {Promise<Account>} - Thông tin tài khoản và hồ sơ liên quan.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin hồ sơ của người dùng đang đăng nhập',
  })
  getProfile(@User('sub') accountID: string) {
    return this.usersService.findAccountById(accountID, [
      'userProfile',
      'role',
    ]);
  }

  /**
   * @route PUT /users/me/profile
   * @description Cập nhật thông tin hồ sơ cho người dùng đang đăng nhập.
   * @param {AuthenticatedUser} user - Đối tượng người dùng đã xác thực, được inject bởi decorator `@User`.
   * @param {UpdateUserProfileDto} updateUserProfileDto - DTO chứa các thông tin cần cập nhật.
   * @returns {Promise<UserProfile>} - Hồ sơ người dùng sau khi đã được cập nhật.
   */
  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật hồ sơ của người dùng đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' })
  async updateProfile(
    @User() user: AuthenticatedUser,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return await this.usersService.updateProfile(user.id, updateUserProfileDto);
  }

  /**
   * @route PATCH /users/me/avatar
   * @description Cập nhật ảnh đại diện cho người dùng đang đăng nhập.
   * @param {string} accountId - ID của tài khoản người dùng.
   * @param {Express.Multer.File} file - Đối tượng file đã được upload.
   * @returns {Promise<object>} - Thông tin hồ sơ người dùng sau khi cập nhật.
   */
  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar')) // 'avatar' là tên field trong FormData
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  async uploadAvatar(
    @User('id') accountId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('Bạn phải cung cấp một file ảnh.');
    }

    // `file.path` sẽ là đường dẫn file trên server, ví dụ: "uploads/avatar-1678886400000-123456789.jpg"
    // Service của bạn sẽ lưu đường dẫn này vào database
    return await this.usersService.updateAvatar(accountId, file.path);
  }

  /**
   * @route GET /users/admin/all
   * @description (Admin) Lấy danh sách tất cả người dùng trong hệ thống với phân trang.
   * @param {number} [page=1] - Số trang hiện tại.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách người dùng và tổng số lượng.
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Lấy danh sách tất cả người dùng' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách người dùng.' })
  async GetUsers(@Query('page') page = 1) {
    return await this.usersService.findAllUser(Number(page), 10);
  }

  /**
   * @route PATCH /users/admin/:id/ban
   * @description (Admin) Khóa (treo) tài khoản của một người dùng.
   * @param {string} id - ID của tài khoản cần khóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận khóa thành công.
   */
  @Patch('admin/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Khóa tài khoản người dùng' })
  @ApiResponse({ status: 200, description: 'Khóa tài khoản thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async banUser(@Param('id') id: string) {
    return await this.usersService.banUser(id);
  }

  /**
   * @route PATCH /users/admin/:id/unban
   * @description (Admin) Mở khóa tài khoản của một người dùng.
   * @param {string} id - ID của tài khoản cần mở khóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận mở khóa thành công.
   */
  @Patch('admin/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: '(Admin) Mở khóa tài khoản người dùng' })
  @ApiResponse({ status: 200, description: 'Mở khóa tài khoản thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async unbanUser(@Param('id') id: string) {
    return await this.usersService.unbanUser(id);
  }
}
