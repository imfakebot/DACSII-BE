import { ApiProperty } from '@nestjs/swagger';

/**
 * @class vnPayIpnResponseDto
 * @description Data Transfer Object (DTO) cho phản hồi mà server của bạn phải trả về
 * cho server VNPAY sau khi xử lý xong một yêu cầu IPN.
 * Việc trả về DTO này xác nhận rằng bạn đã nhận và xử lý thông tin giao dịch.
 */
export class vnPayIpnResponseDto {
  /**
   * Mã phản hồi trả về cho VNPAY.
   * - '00': Xác nhận thành công.
   * - Các mã khác: Giao dịch có lỗi (xem tài liệu VNPAY).
   */
  @ApiProperty({
    description: 'Mã phản hồi cho VNPAY',
    example: '00',
  })
  RspCode!: string;

  /**
   * Thông báo đi kèm mã phản hồi.
   * @example 'Confirm Success'
   */
  @ApiProperty({ description: 'Thông báo cho VNPAY', example: 'Confirm Success' })
  Message!: string;
}
