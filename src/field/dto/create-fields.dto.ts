import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
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
  @ApiProperty({
    description: 'ID của Chi nhánh quản lý sân này',
    format: 'uuid',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;
}
