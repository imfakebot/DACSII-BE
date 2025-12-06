import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * @class CreateFieldDto
 * @description DTO để tạo sân bóng mới trong một Chi nhánh.
 * Địa chỉ sẽ được kế thừa từ Chi nhánh, không cần nhập lại.
 */
export class CreateFieldDto {
  /**
   * @property {string} name
   */
  @ApiProperty({
    description: 'Tên của sân bóng (VD: Sân 5 - A, Sân 7 - B)',
    example: 'Sân 5 số 1',
  })
  @IsString()
  @IsNotEmpty()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @Transform(({ value }) => sanitizeHtml(value)) // Tiện tay chống XSS luôn
  name!: string;

  /**
   * @property {string} description
   */
  @ApiProperty({ required: false, description: 'Mô tả chi tiết về sân' })
  @IsString()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @Transform(({ value }) => sanitizeHtml(value)) // Tiện tay chống XSS luôn
  description?: string;

  /**
   * @property {string} fieldTypeId
   */
  @ApiProperty({
    description: 'ID của loại sân (e.g., sân 5, sân 7)',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldTypeId!: string;

  /**
   * @property {string} branchId - THÊM MỚI
   * @description ID của Chi nhánh mà sân này thuộc về.
   */
  @ApiPropertyOptional({
    description:
      '[DEPRECATED] Không cần cung cấp. ID chi nhánh sẽ được lấy tự động từ tài khoản của bạn.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  /**
   * @property {number[]} utilityIds
   * @description Danh sách ID của các tiện ích có sẵn tại sân.
   */
  @ApiPropertyOptional({
    description: 'Danh sách ID của các tiện ích có sẵn tại sân.',
    type: [Number],
    example: [1, 2, 5],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  utilityIds?: number[];
}
