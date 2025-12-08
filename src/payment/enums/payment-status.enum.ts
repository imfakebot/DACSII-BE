/**
 * @enum PaymentStatus
 * @description Định nghĩa các trạng thái của một giao dịch thanh toán.
 */
export enum PaymentStatus {
  /**
   * Giao dịch đã được khởi tạo nhưng chưa hoàn tất (ví dụ: đang chờ thanh toán).
   */
  PENDING = 'pending',
  /**
   * Giao dịch đã được thanh toán thành công.
   */
  COMPLETED = 'completed',
  /**
   * Giao dịch đã thất bại hoặc bị hủy.
   */
  FAILED = 'failed',
}
