/**
 * @enum {string} BookingStatus
 * @description Định nghĩa các trạng thái có thể có của một lượt đặt sân.
 */
export enum BookingStatus {
    PENDING = 'pending', // Chờ thanh toán hoặc xác nhận
    CONFIRMED = 'confirmed', // Đã xác nhận
    COMPLETED = 'completed', // Đã hoàn thành (sau khi trận đấu diễn ra)
    CANCELLED = 'cancelled', // Đã bị hủy
}
