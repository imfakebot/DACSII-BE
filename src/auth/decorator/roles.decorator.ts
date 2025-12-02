/**
 * @file roles.decorator.ts
 * @description Định nghĩa custom decorator `@Roles` để gán vai trò cho các route handler.
 *
 * Decorator này cho phép bạn chỉ định những vai trò nào được phép truy cập một endpoint cụ thể.
 * Nó hoạt động bằng cách đính kèm một mảng các vai trò (metadata) vào route handler,
 * sau đó một Guard (ví dụ: RolesGuard) có thể đọc metadata này để quyết định có cho phép
 * request tiếp tục hay không.
 */
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/**
 * Khóa (key) để lưu trữ và truy xuất metadata về vai trò từ Reflector.
 * Việc sử dụng một hằng số đảm bảo tính nhất quán trong toàn bộ ứng dụng khi làm việc với metadata.
 */
export const ROLES_KEY = 'roles';

/**
 * Custom decorator `@Roles` để chỉ định các vai trò được phép truy cập một endpoint.
 *
 * @param {...Role[]} roles - Một danh sách các vai trò (dưới dạng enum) được phép.
 * @returns Một decorator function của NestJS.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
