import { UserProfile } from "@/user/entities/users-profile.entity";
import { Role } from "../enums/role.enum";

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