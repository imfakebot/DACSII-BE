/**
 * @file users.decorator.ts
 * @description Định nghĩa custom decorator `@User()` để truy cập thông tin người dùng đã được xác thực.
 *
 * Decorator này giúp lấy đối tượng `user` được các Guard (ví dụ: JwtAuthGuard, LocalAuthGuard)
 * đính kèm vào đối tượng `request` một cách an toàn và có kiểu dữ liệu rõ ràng.
 */
import { UserProfile } from '@/user/entities/users-profile.entity';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/**
 * @interface AuthenticatedUser
 * @description Định nghĩa cấu trúc của đối tượng người dùng sau khi đã xác thực thành công.
 * Dữ liệu này thường được trả về từ phương thức `validate` của một Passport Strategy
 * (ví dụ: `LocalStrategy`, `JwtStrategy`) và được sử dụng trong toàn bộ ứng dụng.
 *
 * @property {UserProfile} [userProfile] - Thông tin hồ sơ chi tiết của người dùng (nếu được tải cùng).
 * @property {string} id - ID của tài khoản (Account), thường giống với `sub`.
 * @property {string} [sub] - Subject của JWT, chính là ID của tài khoản.
 * @property {string} email - Email của người dùng.
 * @property {Role} role - Đối tượng vai trò của người dùng (ví dụ: `{ id: '...', name: 'User' }`).
 * @property {boolean} [is_profile_complete] - Cờ báo hiệu hồ sơ người dùng đã hoàn chỉnh hay chưa.
 */
export interface AuthenticatedUser {
  userProfile?: UserProfile;
  id: string;
  sub?: string;
  email: string;
  role: Role;
  is_profile_complete?: boolean;
}

/**
 * @decorator User
 * @description Một custom parameter decorator để trích xuất đối tượng `user` từ `request`.
 *
 * Thay vì phải viết `req.user` trong mỗi controller, bạn có thể sử dụng `@User()`
 * để lấy thông tin người dùng một cách ngắn gọn và an toàn về kiểu.
 *
 * @param {keyof AuthenticatedUser} [key] - (Tùy chọn) Tên một thuộc tính cụ thể của người dùng để trích xuất (ví dụ: 'id', 'email').
 * @param {ExecutionContext} ctx - Bối cảnh thực thi của request.
 * @returns {AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser]} Toàn bộ đối tượng người dùng nếu không có `key`, hoặc giá trị của thuộc tính tương ứng nếu có `key`.
 *
 * @example
 * // Lấy toàn bộ đối tượng user
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@User() user: AuthenticatedUser) {
 *   return user; // Trả về thông tin người dùng đang đăng nhập
 * }
 * ```
 *
 * @example
 * // Chỉ lấy ID của user
 * ```
 * @Get('some-route')
 * doSomething(@User('id') userId: string) {
 *   // userId sẽ là một chuỗi string
 * }
 * ```
 */
export const User = createParamDecorator(
  <T extends keyof AuthenticatedUser>(
    key: T | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[T] => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;
    return key ? user?.[key] : user; // Nếu có key, trả về thuộc tính tương ứng, ngược lại trả về cả object user
  },
);
