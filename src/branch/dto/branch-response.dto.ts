import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';

export class AddressResponseDto {
  @ApiProperty({ description: 'ID duy nhất của địa chỉ', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Số nhà, tên đường', example: '123 Võ Văn Ngân' })
  street!: string;

  @ApiProperty({ description: 'Vĩ độ', example: 10.853, required: false })
  latitude!: number | null;

  @ApiProperty({ description: 'Kinh độ', example: 106.77, required: false })
  longitude!: number | null;

  @ApiProperty({ description: 'Tên phường/xã' })
  ward_name!: string;

  @ApiProperty({ description: 'Tên thành phố' })
  city_name!: string;
}

export class BranchResponseDto {
  @ApiProperty({
    description: 'ID duy nhất của chi nhánh',
    format: 'uuid',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  id!: string;

  @ApiProperty({
    description: 'Tên của chi nhánh',
    example: 'Sân bóng ABC - Cơ sở 1',
  })
  name!: string;

  @ApiProperty({
    description: 'Số điện thoại liên hệ của chi nhánh',
    example: '02838123456',
    required: false,
  })
  phone_number!: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về chi nhánh',
    example: 'Cơ sở có 5 sân 5 và 2 sân 7, có căng tin và bãi giữ xe rộng rãi.',
    required: false,
  })
  description!: string;

  @ApiProperty({
    description: 'Trạng thái hoạt động (true: hoạt động, false: tạm dừng)',
    example: true,
  })
  status!: boolean;

  @ApiProperty({ description: 'Giờ mở cửa', example: '05:00:00' })
  open_time!: string;

  @ApiProperty({ description: 'Giờ đóng cửa', example: '23:00:00' })
  close_time!: string;

  @ApiProperty({ description: 'Thời điểm tạo' })
  created_at!: Date;

  @ApiProperty({ description: 'Thời điểm cập nhật lần cuối' })
  updated_at!: Date;

  @ApiProperty({ type: AddressResponseDto })
  address!: AddressResponseDto;

  @ApiProperty({ type: UserProfileResponseDto, required: false })
  manager?: UserProfileResponseDto;
}
