/**
 * @enum FeedbackStatus
 * @description Định nghĩa các trạng thái của một ticket feedback.
 * - `OPEN`: Ticket vừa được tạo và đang chờ phản hồi đầu tiên từ admin/manager.
 * - `IN_PROGRESS`: Ticket đã được admin/manager phản hồi và đang trong quá trình xử lý.
 * - `CLOSED`: Ticket đã được giải quyết và đóng lại.
 */
export enum FeedbackStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}
