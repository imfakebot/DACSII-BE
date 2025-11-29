import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
} from 'class-validator';

/**
 * @class CreateReviewDto
 * @description Data Transfer Object (DTO) để tạo một bài đánh giá mới cho một lượt đặt sân.
 */
export class CreateReviewDto {
  /**
   * ID của lượt đặt sân (Booking) mà bài đánh giá này liên quan đến.
   * Phải là một UUID hợp lệ và không được để trống.
   */
  @ApiProperty({ description: 'ID của đơn đặt sân', example: 'uuid-booking' })
  @IsNotEmpty()
  @IsUUID()
  bookingId!: string;

  /**
   * Điểm đánh giá của người dùng cho chất lượng sân và dịch vụ.
   * Phải là một số nguyên từ 1 đến 5.
   */
  @ApiProperty({ description: 'Điểm đánh giá (1-5 sao)', example: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  /**
   * Nội dung bình luận chi tiết của người dùng.
   * Đây là trường không bắt buộc.
   */
  @ApiProperty({
    description: 'Nội dung bình luận (không bắt buộc)',
    example: 'Sân đẹp, cỏ tốt.',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
