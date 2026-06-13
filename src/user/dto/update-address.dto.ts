import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsUUID } from 'class-validator';

/**
 * @class UpdateAddressDto
 * @description DTO để cập nhật thông tin địa chỉ.
 */
export class UpdateAddressDto {
  @ApiProperty({ description: 'Số nhà, tên đường', example: '123 Võ Văn Ngân' })
  @IsString()
  @MaxLength(255)
  street!: string;

  @ApiProperty({ description: 'ID của Thành phố', format: 'uuid' })
  @IsUUID()
  cityId!: string;

  @ApiProperty({ description: 'ID của Phường/Xã', format: 'uuid' })
  @IsUUID()
  wardId!: string;
}
