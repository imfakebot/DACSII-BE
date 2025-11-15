import { AuthGuard } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";

/**
 * @guard JwtAuthGuard
 * @description Một Guard để bảo vệ các route yêu cầu xác thực bằng JSON Web Token (JWT).
 *
 * Khi được áp dụng cho một route, Guard này sẽ tự động kích hoạt chiến lược Passport 'jwt'.
 * Luồng hoạt động như sau:
 * 1. Trích xuất JWT từ `Authorization` header của request (dưới dạng Bearer Token).
 * 2. `JwtStrategy` sẽ được gọi để xác thực token (kiểm tra chữ ký và thời gian hết hạn).
 * 3. Nếu token hợp lệ, hàm `validate` trong `JwtStrategy` sẽ được thực thi.
 * 4. Dữ liệu trả về từ hàm `validate` (thường là payload của token) sẽ được gắn vào `req.user`.
 * 5. Nếu token không hợp lệ hoặc không được cung cấp, Guard sẽ trả về lỗi `401 Unauthorized`.
 *
 * @example
 *
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Req() req) {
 *   return req.user;
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }