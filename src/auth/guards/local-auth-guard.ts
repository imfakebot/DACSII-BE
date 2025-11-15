import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * @guard LocalAuthGuard
 * @description Một Guard để bảo vệ route đăng nhập và kích hoạt chiến lược xác thực 'local'.
 *
 * Khi được áp dụng cho một route (thường là route đăng nhập), Guard này sẽ tự động:
 * 1. Trích xuất `email` và `password` từ body của request.
 * 2. Gọi `LocalStrategy` để thực thi logic xác thực.
 * 3. `LocalStrategy` sẽ gọi phương thức `validateUser` trong `AuthService`.
 * 4. Nếu xác thực thành công, thông tin người dùng sẽ được gắn vào `req.user`.
 * 5. Nếu xác thực thất bại (sai email/mật khẩu, tài khoản chưa xác thực), Guard sẽ tự động trả về lỗi `401 Unauthorized`.
 *
 * @example
 * ```
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * login(@User() user: AuthenticatedUser) {
 *   return this.authService.login(user);
 * }
 * ```
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') { }
