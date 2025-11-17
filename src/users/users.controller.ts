import { Controller, Get, UseGuards, Put, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthenticatedUser, User } from '@/auth/decorator/users.decorator';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

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
    @ApiOperation({ summary: 'Lấy thông tin hồ sơ của người dùng đang đăng nhập' })
    getProfile(@User('sub') accountID: string) {
        return this.usersService.findAccountById(accountID);
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
}
