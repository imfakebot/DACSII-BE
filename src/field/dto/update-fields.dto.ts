import { ApiProperty, PartialType } from '@nestjs/swagger'; // Import từ @nestjs/swagger để tích hợp Swagger
import { CreateFieldDto } from './create-fields.dto';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * UpdateFieldDto kế thừa tất cả các thuộc tính từ CreateFieldDto,
 * nhưng đánh dấu tất cả chúng là tùy chọn (`@IsOptional()`).
 * Điều này cho phép client chỉ gửi những trường họ muốn cập nhật.
 */
export class UpdateFieldDto extends PartialType(CreateFieldDto) {
  /**
   * Trạng thái hoạt động của sân bóng.
   * true: Đang hoạt động, false: Tạm ngưng.
   */
  @ApiProperty({
    required: false,
    description: 'Trạng thái hoạt động của sân',
    example: false,
  })
  @IsBoolean() // Đảm bảo giá trị gửi lên phải là true hoặc false
  @IsOptional()
  status?: boolean;
}
