import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công', example: true })
  isSuccess!: boolean;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Giao dịch thành công',
  })
  message!: string;

  @ApiProperty({ description: 'Mã đơn hàng', example: 'uuid-cua-ban' })
  orderId!: string;

  @ApiProperty({ description: 'Số tiền', example: 150000 })
  amount!: number;

  @ApiProperty({
    description: 'Mã phản hồi từ VNPAY (nếu có)',
    example: '00',
    required: false,
  })
  rspCode?: string;

  @ApiProperty({
    description: 'Ngày giao dịch (nếu có)',
    example: '20231120103000',
    required: false,
  })
  transactionDate?: string;
}
