import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

/**
 * @class VnpayReturnDto
 * @description Data Transfer Object (DTO) để nhận và xác thực các tham số query do VNPAY
 * gửi về URL trả về (vnp_ReturnUrl) phía client sau khi người dùng hoàn tất giao dịch.
 * Các thuộc tính trong DTO này tương ứng với các tham số do VNPAY định nghĩa.
 */
export class VnpayReturnDto {
  /**
   * Số tiền thanh toán, đơn vị: đồng. VNPAY trả về giá trị nhân 100.
   * @example '10000000' (tương đương 100,000 VNĐ)
   */
  @ApiProperty({
    description: 'Số tiền thanh toán (đơn vị: VNĐ * 100)',
    example: '10000000',
  })
  @IsNotEmpty()
  vnp_Amount!: string;

  /**
   * Mã ngân hàng hoặc ví điện tử thanh toán.
   * @example 'NCB'
   */
  @ApiProperty({ description: 'Mã ngân hàng', example: 'NCB' })
  @IsOptional()
  vnp_BankCode!: string;

  /**
   * Mã giao dịch của ngân hàng (nếu có).
   */
  @ApiProperty({
    description: 'Mã giao dịch tại ngân hàng',
    example: 'VNP12345',
  })
  @IsOptional()
  vnp_BankTranNo!: string;

  /**
   * Loại thẻ đã sử dụng (ATM, VISA, MASTERCARD, v.v.).
   */
  @ApiProperty({ description: 'Loại thẻ', example: 'ATM' })
  @IsOptional()
  vnp_CardType!: string;

  /**
   * Nội dung thanh toán đã gửi cho VNPAY.
   */
  @ApiProperty({
    description: 'Nội dung thanh toán',
    example: 'Thanh toan don hang ...',
  })
  @IsOptional()
  vnp_OrderInfo!: string;

  /**
   * Thời gian hoàn tất thanh toán, định dạng YYYYMMDDHHmmss.
   */
  @ApiProperty({
    description: 'Ngày thanh toán (YYYYMMDDHHmmss)',
    example: '20231120103000',
  })
  @IsOptional()
  vnp_PayDate!: string;

  /**
   * Mã phản hồi của VNPAY. '00' là thành công.
   */
  @ApiProperty({ description: 'Mã phản hồi (00 là thành công)', example: '00' })
  @IsNotEmpty()
  vnp_ResponseCode!: string;

  /**
   * Mã định danh của website/merchant tại VNPAY (TmnCode).
   */
  @ApiProperty({
    description: 'Mã định danh website (Terminal ID)',
    example: 'CODE123',
  })
  @IsNotEmpty()
  vnp_TmnCode!: string;

  /**
   * Mã giao dịch duy nhất do VNPAY tạo ra.
   */
  @ApiProperty({
    description: 'Mã giao dịch ghi nhận tại hệ thống VNPAY',
    example: '14234523',
  })
  @IsNotEmpty()
  vnp_TransactionNo!: string;

  /**
   * Trạng thái giao dịch chi tiết của VNPAY. '00' là thành công.
   */
  @ApiProperty({ description: 'Trạng thái giao dịch', example: '00' })
  @IsOptional()
  vnp_TransactionStatus!: string;

  /**
   * Mã tham chiếu của đơn hàng phía merchant, chính là ID của đơn đặt sân (Booking ID).
   */
  @ApiProperty({
    description: 'Mã tham chiếu đơn hàng (Booking ID)',
    example: 'uuid-cua-ban',
  })
  @IsNotEmpty()
  vnp_TxnRef!: string;

  /**
   * Chữ ký bảo mật do VNPAY tạo ra để xác thực tính toàn vẹn của dữ liệu.
   */
  @ApiProperty({
    description: 'Chữ ký bảo mật để kiểm tra toàn vẹn dữ liệu',
    example: 'a1b2c3d4...',
  })
  @IsNotEmpty()
  vnp_SecureHash!: string;

  /**
   * Loại thuật toán hash được sử dụng để tạo chữ ký (mặc định là SHA256, VNPAY mới là SHA512).
   */
  @ApiProperty({
    description: 'Loại thuật toán mã hóa (SHA256)',
    example: 'SHA256',
    required: false,
  })
  @IsOptional()
  vnp_SecureHashType?: string;
}
