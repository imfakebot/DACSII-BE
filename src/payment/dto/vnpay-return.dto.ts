import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class VnpayReturnDto {
  @ApiProperty({
    description: 'Số tiền thanh toán (đơn vị: VNĐ * 100)',
    example: '10000000',
  })
  @IsNotEmpty()
  vnp_Amount!: string;

  @ApiProperty({ description: 'Mã ngân hàng', example: 'NCB' })
  @IsOptional()
  vnp_BankCode!: string;

  @ApiProperty({
    description: 'Mã giao dịch tại ngân hàng',
    example: 'VNP12345',
  })
  @IsOptional()
  vnp_BankTranNo!: string;

  @ApiProperty({ description: 'Loại thẻ', example: 'ATM' })
  @IsOptional()
  vnp_CardType!: string;

  @ApiProperty({
    description: 'Nội dung thanh toán',
    example: 'Thanh toan don hang ...',
  })
  @IsOptional()
  vnp_OrderInfo!: string;

  @ApiProperty({
    description: 'Ngày thanh toán (YYYYMMDDHHmmss)',
    example: '20231120103000',
  })
  @IsOptional()
  vnp_PayDate!: string;

  @ApiProperty({ description: 'Mã phản hồi (00 là thành công)', example: '00' })
  @IsNotEmpty()
  vnp_ResponseCode!: string;

  @ApiProperty({
    description: 'Mã định danh website (Terminal ID)',
    example: 'CODE123',
  })
  @IsNotEmpty()
  vnp_TmnCode!: string;

  @ApiProperty({
    description: 'Mã giao dịch ghi nhận tại hệ thống VNPAY',
    example: '14234523',
  })
  @IsNotEmpty()
  vnp_TransactionNo!: string;

  @ApiProperty({ description: 'Trạng thái giao dịch', example: '00' })
  @IsOptional()
  vnp_TransactionStatus!: string;

  @ApiProperty({
    description: 'Mã tham chiếu đơn hàng (Booking ID)',
    example: 'uuid-cua-ban',
  })
  @IsNotEmpty()
  vnp_TxnRef!: string;

  @ApiProperty({
    description: 'Chữ ký bảo mật để kiểm tra toàn vẹn dữ liệu',
    example: 'a1b2c3d4...',
  })
  @IsNotEmpty()
  vnp_SecureHash!: string;

  @ApiProperty({
    description: 'Loại thuật toán mã hóa (SHA256)',
    example: 'SHA256',
    required: false,
  })
  @IsOptional()
  vnp_SecureHashType?: string;
}
