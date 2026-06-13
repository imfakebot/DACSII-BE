import { ApiProperty } from '@nestjs/swagger';
import { FieldDto } from './field.dto';
import { FieldsMetadataDto } from './fields-metadata.dto';

export class FieldsResponseDto {
  @ApiProperty({ type: [FieldDto], description: 'Danh sách sân bóng' })
  data!: FieldDto[];

  @ApiProperty({ type: FieldsMetadataDto, description: 'Thông tin phân trang và metadata' })
  metadata!: FieldsMetadataDto;
}
