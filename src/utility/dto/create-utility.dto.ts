import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateUtilityDto {
  @ApiProperty({
    description: 'Tên của tiện ích',
    example: 'Wi-Fi miễn phí',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'URL đến icon đại diện cho tiện ích',
    example: 'https://example.com/icons/wifi.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Icon URL phải là một địa chỉ web hợp lệ.' })
  iconUrl?: string;
}
