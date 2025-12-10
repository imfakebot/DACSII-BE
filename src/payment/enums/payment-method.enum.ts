/**
 * @enum PaymentMethod
 * @description Định nghĩa các phương thức thanh toán được hỗ trợ trong hệ thống.
 */
export enum PaymentMethod {
  /**
   * Thanh toán bằng tiền mặt, thường dùng cho các giao dịch tại quầy.
   */
  CASH = 'cash',
  /**
   * Thanh toán qua ví điện tử MoMo.
   */
  MOMO = 'momo',
  /**
   * Thanh toán qua cổng VNPAY (Thẻ nội địa, Thẻ quốc tế, VNPAY-QR).
   */
  VNPAY = 'vnpay',
  /**
   * Chuyển khoản ngân hàng.
   */
  BANKING = 'banking',
}
