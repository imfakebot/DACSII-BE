import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

/**
 * @class CreatePaymentDto
 * @description Data Transfer Object (DTO) để tạo một yêu cầu thanh toán mới.
 * DTO này định nghĩa các thông tin cơ bản cần thiết để khởi tạo một giao dịch.
 * @deprecated DTO này hiện không được sử dụng trực tiếp trong luồng thanh toán chính,
 * thay vào đó, URL thanh toán được tạo dựa trên thông tin đơn đặt sân đã có.
 */
export class CreatePaymentDto {
  /**
   * Số tiền cần thanh toán, tính bằng VNĐ.
   * Giá trị phải lớn hơn hoặc bằng 1000.
   */
  @ApiProperty({
    description: 'Số tiền thanh toán (VNĐ)',
    example: 50000,
    minimum: 1000,
  })
  @IsNotEmpty({ message: 'Số tiền (amount) không được để trống' })
  @IsNumber({}, { message: 'Số tiền (amount) phải là dạng số' })
  @Min(1000, { message: 'Số tiền thanh toán tối thiểu là 1.000 VNĐ' }) // VNPay thường yêu cầu tối thiểu
  amount!: number;

  /**
   * Mã định danh duy nhất cho đơn hàng hoặc giao dịch cần thanh toán.
   */
  @ApiProperty({
    description: 'Mã định danh duy nhất cho đơn hàng',
    example: 'ORDER-1678886400000',
  })
  @IsNotEmpty({ message: 'Mã đơn hàng (orderId) không được để trống' })
  @IsString({ message: 'Mã đơn hàng (orderId) phải là chuỗi ký tự' })
  orderId!: string;
}
