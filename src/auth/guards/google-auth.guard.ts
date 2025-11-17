import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * @guard GoogleAuthGuard
 * @description Một Guard để bảo vệ các route yêu cầu xác thực qua Google.
 *
 * Khi được áp dụng cho một route, Guard này sẽ kích hoạt chiến lược Passport 'google'.
 * - Đối với route bắt đầu (e.g., `/auth/google`), nó sẽ chuyển hướng người dùng đến trang đăng nhập của Google.
 * - Đối với route callback (e.g., `/auth/google/callback`), nó sẽ xử lý thông tin người dùng trả về từ Google
 *   và gọi hàm `validate` trong `GoogleStrategy` để xác thực hoặc tạo người dùng.
 *
 * @example
 *
 * @Get('google')
 * @UseGuards(GoogleAuthGuard)
 * googleAuth() { // Passport sẽ tự động chuyển hướng }
 * ```
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
