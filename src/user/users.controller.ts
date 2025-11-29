import {
  Controller,
  Get,
  UseGuards,
  Put,
  Body,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthenticatedUser, User } from '@/auth/decorator/users.decorator';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { Roles } from '@/auth/decorator/roles.decorator';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Role } from '../auth/enums/role.enum';

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
    return this.usersService.findAccountById(accountID, ['userProfile', 'role']);
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
}
