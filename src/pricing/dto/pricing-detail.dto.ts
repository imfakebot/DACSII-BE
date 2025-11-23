import { ApiProperty } from '@nestjs/swagger';

export class PricingDetailsDto {
  @ApiProperty({ example: 300000, description: 'Đơn giá theo giờ (VND)' })
  price_per_hour!: number;

  @ApiProperty({ example: 450000, description: 'Tổng tiền phải trả (VND)' })
  total_price!: number;

  @ApiProperty({ example: 'VND', description: 'Đơn vị tiền tệ' })
  currency!: string;
}
