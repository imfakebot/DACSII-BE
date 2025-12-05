import { ApiProperty } from '@nestjs/swagger';

export class vnPayIpnResponseDto {
  @ApiProperty({
    description: 'Mã phản hồi cho VNPAY',
    example: '00',
  })
  RspCode!: string;
  @ApiProperty({ description: 'Thông báo cho VNPAY', example: 'Confirm Success' })
  Message!: string;
}
