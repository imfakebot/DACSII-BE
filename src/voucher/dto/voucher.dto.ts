import { ApiProperty } from '@nestjs/swagger';

export class VoucherDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'SUMMER2024' })
  code!: string;

  @ApiProperty({ required: false })
  discountAmount!: number | null;

  @ApiProperty({ required: false })
  discountPercentage!: number | null;

  @ApiProperty({ required: false })
  maxDiscountAmount!: number | null;

  @ApiProperty()
  minOrderValue!: number;

  @ApiProperty()
  validFrom!: Date;

  @ApiProperty()
  validTo!: Date;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ required: false })
  userProfileId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class VoucherCheckResponseDto {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: 'SUMMER2024' })
  code!: string;

  @ApiProperty({ example: 50000 })
  discountAmount!: number;

  @ApiProperty({ example: 450000 })
  finalAmount!: number;

  @ApiProperty({ example: 'Áp dụng mã giảm giá thành công' })
  message!: string;
}
