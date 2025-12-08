import { ApiProperty } from '@nestjs/swagger';

/**
 * @class PaymentResponseDto
 * @description Data Transfer Object (DTO) cho phản hồi sau khi xử lý một giao dịch thanh toán,
 * đặc biệt là kết quả trả về từ `vnpay_return` URL.
 */
export class PaymentResponseDto {
  /**
   * Cờ báo hiệu giao dịch có thành công hay không dựa trên việc xác thực chữ ký và mã phản hồi.
   * `true` nếu hợp lệ và thành công, ngược lại `false`.
   */
  @ApiProperty({ description: 'Trạng thái thành công', example: true })
  isSuccess!: boolean;

  /**
   * Thông báo mô tả kết quả của giao dịch.
   * @example 'Giao dịch thành công'
   */
  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Giao dịch thành công',
  })
  message!: string;

  /**
   * ID của đơn hàng (booking) liên quan đến giao dịch.
   */
  @ApiProperty({ description: 'Mã đơn hàng', example: 'uuid-cua-ban' })
  orderId!: string;

  /**
   * Số tiền của giao dịch.
   */
  @ApiProperty({ description: 'Số tiền', example: 150000 })
  amount!: number;

  /**
   * Mã phản hồi từ VNPAY (`vnp_ResponseCode`). '00' là thành công.
   */
  @ApiProperty({
    description: 'Mã phản hồi từ VNPAY (nếu có)',
    example: '00',
    required: false,
  })
  rspCode?: string;

  /**
   * Ngày giao dịch từ VNPAY (`vnp_PayDate`), định dạng YYYYMMDDHHmmss.
   */
  @ApiProperty({
    description: 'Ngày giao dịch (nếu có)',
    example: '20231120103000',
    required: false,
  })
  transactionDate?: string;
}
