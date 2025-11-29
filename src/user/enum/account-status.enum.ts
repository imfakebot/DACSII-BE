/**
 * Enum định nghĩa các trạng thái có thể có của một tài khoản.
 */
export enum AccountStatus {
  /** Tài khoản đang hoạt động bình thường. */
  ACTIVE = 'active',
  /** Tài khoản đã bị tạm khóa. */
  SUSPENDED = 'suspended',
  /** Tài khoản đã bị xóa. */
  DELETED = 'deleted',
}
