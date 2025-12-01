/**
 * @file users.decorator.ts
 * @description Định nghĩa custom decorator `@User()` để truy cập thông tin người dùng đã được xác thực.
 *
 * Decorator này giúp lấy đối tượng `user` được các Guard (ví dụ: JwtAuthGuard, LocalAuthGuard)
 * đính kèm vào đối tượng `request` một cách an toàn và có kiểu dữ liệu rõ ràng.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interface/authenicated-user.interface';



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
