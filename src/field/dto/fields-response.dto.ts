import { ApiProperty } from '@nestjs/swagger';
import { FieldDto } from './field.dto';

export class FieldsMetadataDto {
  @ApiProperty({ description: 'Tổng số lượng sân khớp với bộ lọc' })
  total!: number;

  @ApiProperty({ description: 'Trang hiện tại' })
  page!: number;

  @ApiProperty({ description: 'Số lượng kết quả mỗi trang' })
  limit!: number;

  @ApiProperty({ description: 'Trang cuối cùng' })
  lastPage!: number;

  @ApiProperty({ description: 'Đánh dấu nếu đây là danh sách sân gợi ý (do không tìm thấy sân trong bán kính)' })
  isSuggestion!: boolean;

  @ApiProperty({ description: 'Thông báo gợi ý cho người dùng', required: false, nullable: true })
  suggestionMessage?: string | null;
}

export class FieldsResponseDto {
  @ApiProperty({ type: [FieldDto], description: 'Danh sách sân bóng' })
  data!: FieldDto[];

  @ApiProperty({ type: FieldsMetadataDto, description: 'Thông tin phân trang và metadata' })
  metadata!: FieldsMetadataDto;
}
