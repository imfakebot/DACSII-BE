import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { AuthenticatedUser } from '../interface/authenicated-user.interface';
import { ROLES_KEY } from '../decorator/roles.decorator';

/**
 * @guard RolesGuard
 * @description Một Guard để kiểm tra xem người dùng hiện tại có vai trò (role)
 * được yêu cầu để truy cập một route cụ thể hay không.
 * Guard này hoạt động kết hợp với decorator `@Roles(...roles)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * @param {Reflector} reflector - Một helper class của NestJS để truy xuất metadata
   * được đính kèm vào các class hoặc handler (ví dụ: các vai trò được định nghĩa bởi `@Roles`).
   */
  constructor(private reflector: Reflector) { }

  /**
   * @method canActivate
   * @description Phương thức này được NestJS tự động gọi để quyết định một request có được phép tiếp tục hay không.
   * @param {ExecutionContext} context - Cung cấp thông tin về request đang được xử lý.
   * @returns {boolean} - `true` nếu người dùng có vai trò hợp lệ, ngược lại `false`.
   */
  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách các vai trò yêu cầu từ metadata của route handler hoặc controller.
    const requireRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Nếu không có vai trò nào được yêu cầu, cho phép truy cập.
    if (!requireRoles) {
      return true;
    }
    // Lấy thông tin người dùng đã được xác thực từ request (được gắn bởi một Guard khác như JwtAuthGuard).
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();

    if (!user || !user.role) {
      return false;
    }

    // Lấy tên vai trò. Payload của JWT có thể chứa object role hoặc chỉ là string.
    const userRoleName =
      typeof user.role === 'object' && user.role !== null && 'name' in user.role
        ? (user.role as { name: string }).name // Nếu là object { id, name }
        : user.role; // Nếu chỉ là string

    // Kiểm tra xem vai trò của người dùng có nằm trong danh sách các vai trò được yêu cầu hay không.
    return requireRoles.some((role) => String(userRoleName) === String(role));
  }
}
