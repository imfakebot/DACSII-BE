import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  Matches,
  IsPhoneNumber,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({
    description: 'Tên của chi nhánh',
    example: 'Sân bóng ABC - Cơ sở 2',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ của chi nhánh',
    example: '02838123457',
  })
  @IsOptional()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ.' })
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết về chi nhánh',
    example: 'Cơ sở mới khai trương, có sân cỏ nhân tạo chất lượng cao.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Giờ mở cửa của chi nhánh', example: '05:00:00' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'Giờ mở cửa không hợp lệ (HH:mm:ss)',
  })
  open_time!: string;

  @ApiProperty({
    description: 'Giờ đóng cửa của chi nhánh',
    example: '23:00:00',
  })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'Giờ đóng cửa không hợp lệ (HH:mm:ss)',
  })
  close_time!: string;

  // Address fields
  @ApiProperty({ description: 'Số nhà, tên đường', example: '123 Đường số 4' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ description: 'ID của Tỉnh/Thành phố' })
  @IsNumber()
  @IsNotEmpty()
  cityId!: number;

  @ApiProperty({ description: 'ID của Phường/Xã' })
  @IsNumber()
  @IsNotEmpty()
  wardId!: number;

  @ApiPropertyOptional({
    description: 'ID của người quản lý chi nhánh (UserProfile ID)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  manager_id?: string;

  @ApiPropertyOptional({
    description:
      'Vĩ độ (latitude) của chi nhánh. Nếu được cung cấp, sẽ bỏ qua bước geocoding.',
    example: 10.8507,
  })
  @IsOptional()
  @IsLatitude({ message: 'Vĩ độ không hợp lệ.' })
  latitude?: number;

  @ApiPropertyOptional({
    description:
      'Kinh độ (longitude) của chi nhánh. Nếu được cung cấp, sẽ bỏ qua bước geocoding.',
    example: 106.7722,
  })
  @IsOptional()
  @IsLongitude({ message: 'Kinh độ không hợp lệ.' })
  longitude?: number;
}
