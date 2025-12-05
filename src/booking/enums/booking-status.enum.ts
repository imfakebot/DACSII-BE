/**
 * @enum {string} BookingStatus
 * @description Định nghĩa các trạng thái có thể có của một lượt đặt sân.
 */
export enum BookingStatus {
  /** Chờ thanh toán. Đơn được tạo nhưng chưa hoàn tất thanh toán online. */
  PENDING = 'pending',

  /** Đã xác nhận bởi nhân viên/quản lý nhưng chưa có thanh toán (dành cho các kịch bản đặc biệt). */
  CONFIRMED = 'confirmed',

  /** Đã thanh toán thành công và xác nhận, sẵn sàng để check-in. */
  COMPLETED = 'completed',

  /** Đã bị hủy (bởi người dùng hoặc hệ thống). */
  CANCELLED = 'cancelled',

  /** Khách đã check-in tại sân để bắt đầu trận đấu. */
  CHECKED_IN = 'checked_in',

  /** Trận đấu đã kết thúc. */
  FINISHED = 'finished',
}
