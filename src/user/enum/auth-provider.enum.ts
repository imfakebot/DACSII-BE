/**
 * Enum định nghĩa các nhà cung cấp xác thực được hỗ trợ.
 */
export enum AuthProvider {
  /** Xác thực bằng email và mật khẩu. */
  CREDENTIALS = 'credentials',
  /** Xác thực qua Google. */
  GOOGLE = 'google',
}
