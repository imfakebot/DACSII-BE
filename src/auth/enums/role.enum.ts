/**
 * @enum Role
 * @description Định nghĩa các vai trò người dùng trong hệ thống.
 * - `User`: Vai trò người dùng thông thường.
 * - `Admin`: Vai trò quản trị viên, có quyền hạn cao hơn.
 */
export enum Role {
  User = 'user',
  Admin = 'super_admin',
  Staff = 'staff',
  Manager = 'branch_manager',
}
