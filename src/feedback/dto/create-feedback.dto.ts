import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @class CreateFeedbackDto
 * @description Data Transfer Object để tạo một ticket feedback/hỗ trợ mới.
 * Chứa tiêu đề, danh mục và nội dung tin nhắn đầu tiên.
 */
export class CreateFeedbackDto {
  @ApiProperty({ description: 'Tiêu đề của feedback', example: 'Góp ý về sân' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Danh mục của feedback',
    example: 'suggestion',
  })
  @IsNotEmpty()
  @IsString()
  category!: string; // Có thể dùng Enum nếu muốn chặt chẽ

  @ApiProperty({
    description: 'Nội dung chi tiết của feedback',
    example: 'Sân nên có thêm ghế ngồi.',
  })
  @IsNotEmpty()
  @IsString()
  content!: string; // Nội dung tin nhắn đầu tiên
}
