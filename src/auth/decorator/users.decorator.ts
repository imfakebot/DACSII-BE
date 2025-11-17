/**
 * @file users.decorator.ts
 * @description Định nghĩa custom decorator `@User()` để truy cập thông tin người dùng đã được xác thực.
 *
 * Decorator này giúp lấy đối tượng `user` được các Guard (ví dụ: JwtAuthGuard, LocalAuthGuard)
 * đính kèm vào đối tượng `request` một cách an toàn và có kiểu dữ liệu rõ ràng.
 */
import { UserProfile } from '@/users/entities/users-profile.entity';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @interface AuthenticatedUser
 * @description Định nghĩa cấu trúc của đối tượng người dùng sau khi đã xác thực thành công.
 * Dữ liệu này thường được trả về từ phương thức `validate` của một Passport Strategy
 * (ví dụ: `LocalStrategy`, `JwtStrategy`) và được sử dụng trong toàn bộ ứng dụng.
 *
 * @property {UserProfile} [userProfile] - Thông tin hồ sơ chi tiết của người dùng (nếu được tải cùng).
 * @property {string} id - ID của tài khoản (Account).
 * @property {string} email - Email của người dùng.
 * @property {string} [user_profile_id] - Khóa ngoại đến bảng user_profiles.
 * @property {{ id: string; name?: string }} role - Vai trò của người dùng.
 * @property {boolean} [is_profile_complete] - Cờ báo hiệu hồ sơ người dùng đã hoàn chỉnh hay chưa.
 */
export interface AuthenticatedUser {
    userProfile?: UserProfile;
    id: string;
    email: string;
    user_profile_id?: string;
    role: { id: string; name?: string; };
    is_profile_complete?: boolean;
}

/**
 * @decorator User
 * @description Một custom parameter decorator để trích xuất đối tượng `user` từ `request`.
 *
 * Thay vì phải viết `req.user` trong mỗi controller, bạn có thể sử dụng `@User()`
 * để lấy thông tin người dùng một cách ngắn gọn và an toàn về kiểu.
 *
 * @param {unknown} data - Dữ liệu tùy chọn có thể được truyền vào decorator (hiện không sử dụng).
 * @param {ExecutionContext} ctx - Bối cảnh thực thi của request.
 * @returns {AuthenticatedUser} Đối tượng người dùng đã được xác thực.
 *
 * @example
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@User() user: AuthenticatedUser) {
 *   return user; // Trả về thông tin người dùng đang đăng nhập
 * }
 * ```
 */
export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
        return request.user;
    },
);