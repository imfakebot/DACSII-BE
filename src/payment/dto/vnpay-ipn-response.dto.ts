import { ApiProperty } from '@nestjs/swagger';

/**
 * @class vnPayIpnResponseDto
 * @description DTO cho phản hồi trả về cho server VNPAY sau khi xử lý IPN.
 */
export class vnPayIpnResponseDto {
  @ApiProperty({
    description: 'Mã phản hồi cho VNPAY',
    example: '00',
  })
  RspCode!: string;
  @ApiProperty({ description: 'Thông báo cho VNPAY', example: 'Confirm Success' })
  Message!: string;
}
