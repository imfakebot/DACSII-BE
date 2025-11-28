import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Số tiền thanh toán (VNĐ)',
    example: 50000,
    minimum: 1000,
  })
  @IsNotEmpty({ message: 'Số tiền (amount) không được để trống' })
  @IsNumber({}, { message: 'Số tiền (amount) phải là dạng số' })
  @Min(1000, { message: 'Số tiền thanh toán tối thiểu là 1.000 VNĐ' }) // VNPay thường yêu cầu tối thiểu
  amount!: number;

  @ApiProperty({
    description: 'Mã định danh duy nhất cho đơn hàng',
    example: 'ORDER-1678886400000',
  })
  @IsNotEmpty({ message: 'Mã đơn hàng (orderId) không được để trống' })
  @IsString({ message: 'Mã đơn hàng (orderId) phải là chuỗi ký tự' })
  orderId!: string;
}
