import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/**
 * @guard JwtRefreshGuard
 * @description Một Guard để bảo vệ route làm mới token (refresh token).
 *
 * Khi được áp dụng cho một route, Guard này sẽ tự động kích hoạt chiến lược Passport 'jwt-refresh'.
 * Luồng hoạt động như sau:
 * 1. `JwtRefreshStrategy` sẽ được gọi để trích xuất refresh token từ cookie của request.
 * 2. Chiến lược sẽ xác thực token (kiểm tra chữ ký và thời gian hết hạn).
 * 3. Nếu token hợp lệ, hàm `validate` trong `JwtRefreshStrategy` sẽ được thực thi.
 * 4. Dữ liệu trả về từ hàm `validate` (payload của token) sẽ được gắn vào `req.user`.
 * 5. Nếu token không hợp lệ, hết hạn, hoặc không được cung cấp, Guard sẽ trả về lỗi `401 Unauthorized`.
 *
 * @example
 * ```
 * @UseGuards(JwtRefreshGuard)
 * @Post('refresh')
 * refreshTokens(@Req() req) { // req.user sẽ chứa payload của token
 *   return this.authService.refreshTokens(req.user.sub);
 * }
 * ```
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
