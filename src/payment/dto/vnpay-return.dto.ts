import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

/**
 * @class VnpayReturnDto
 * @description Data Transfer Object (DTO) nhận tham số từ VNPAY.
 * Các trường vnp_ là bắt buộc để đảm bảo an toàn giao dịch.
 */
export class VnpayReturnDto {
  @ApiProperty({ description: 'Số tiền thanh toán (VNĐ * 100)' })
  @IsNotEmpty()
  vnp_Amount!: string;

  @IsOptional()
  vnp_BankCode?: string;

  @IsOptional()
  vnp_BankTranNo?: string;

  @IsOptional()
  vnp_CardType?: string;

  @IsOptional()
  vnp_OrderInfo?: string;

  @IsOptional()
  vnp_PayDate?: string;

  @ApiProperty({ description: 'Mã phản hồi' })
  @IsNotEmpty()
  vnp_ResponseCode!: string;

  @ApiProperty({ description: 'Terminal ID' })
  @IsNotEmpty()
  vnp_TmnCode!: string;

  @ApiProperty({ description: 'Mã giao dịch VNPAY' })
  @IsNotEmpty()
  vnp_TransactionNo!: string;

  @IsOptional()
  vnp_TransactionStatus?: string;

  @ApiProperty({ description: 'Booking ID (từ VNPAY)' })
  @IsNotEmpty()
  vnp_TxnRef!: string;

  /**
   * @description ID đơn hàng bổ sung (Nếu cần dùng cho mục đích khác)
   */
  @IsOptional()
  bookingId?: string;

  @ApiProperty({ description: 'Chữ ký bảo mật' })
  @IsNotEmpty()
  vnp_SecureHash!: string;

  @IsOptional()
  vnp_SecureHashType?: string;

  @ApiPropertyOptional({
    description: 'Nền tảng thực hiện thanh toán',
    enum: ['web', 'mobile'],
  })
  @IsOptional()
  platform?: string;
}
