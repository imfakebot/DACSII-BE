import { ApiProperty } from '@nestjs/swagger';
import { Booking } from '../entities/booking.entity';

/**
 * @class CreateBookingResponse
 * @description Data Transfer Object (DTO) cho phản hồi khi tạo một lượt đặt sân thành công.
 * Chứa thông tin cần thiết để client tiếp tục quá trình thanh toán và hiển thị kết quả.
 */
export class BookingResponse {
  /**
   * Một thông báo tóm tắt kết quả của yêu cầu.
   * @example 'Đặt sân thành công, vui lòng thanh toán.'
   */
  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Đặt sân thành công, vui lòng thanh toán.',
  })
  message!: string;

  /**
   * URL thanh toán (ví dụ: VNPay) được tạo ra để người dùng hoàn tất giao dịch.
   * Client sẽ chuyển hướng người dùng đến URL này.
   */
  @ApiProperty({
    description: 'URL để chuyển hướng người dùng đến trang thanh toán',
  })
  paymentUrl!: string;

  /**
   * Số tiền cuối cùng người dùng cần thanh toán sau khi đã áp dụng tất cả các giảm giá (voucher).
   * @example 150000
   */
  @ApiProperty({
    description: 'Số tiền cuối cùng cần thanh toán sau khi áp dụng voucher',
    example: 150000,
  })
  finalAmount!: number;

  /**
   * Đối tượng `Booking` vừa được tạo và lưu trong cơ sở dữ liệu.
   * Chứa tất cả chi tiết về lượt đặt sân.
   */
  @ApiProperty({ type: Booking })
  booking!: Booking;
}
