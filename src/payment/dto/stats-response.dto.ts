import { ApiProperty } from '@nestjs/swagger';

export class StatsResponseDto {
  @ApiProperty({ example: 15000000 })
  revenue!: number;

  @ApiProperty({
    example: {
      pending: 5,
      completed: 10,
      failed: 2,
    },
  })
  transactions!: Record<string, number>;
}

export class RevenueChartItemDto {
  @ApiProperty({ example: 1 })
  month!: number;

  @ApiProperty({ example: 5000000 })
  revenue!: number;
}

export class PaymentUrlResponseDto {
  @ApiProperty({ example: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...' })
  url!: string;
}
