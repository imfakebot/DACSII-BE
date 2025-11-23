import { ApiProperty } from '@nestjs/swagger';

export class BookingDetailsDto {
  @ApiProperty({ example: '20/11/2025', description: 'Ngày đặt sân' })
  date!: string;

  @ApiProperty({ example: '17:30', description: 'Giờ bắt đầu' })
  start_time!: string;

  @ApiProperty({ example: '19:00', description: 'Giờ kết thúc' })
  end_time!: string;

  @ApiProperty({ example: '90 phút', description: 'Thời lượng đá' })
  duration!: string;
}
