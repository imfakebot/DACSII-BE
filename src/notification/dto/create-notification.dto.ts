import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * @class CreateNotificationDto
 * @description Data Transfer Object (DTO) để tạo một thông báo mới.
 */
export class CreateNotificationDto {
  /**
   * Tiêu đề của thông báo.
   * Không được để trống.
   */
  @ApiProperty({
    description: 'Tiêu đề của thông báo',
    example: 'Đơn đặt sân đã được xác nhận',
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  /**
   * Nội dung chi tiết của thông báo.
   * Không được để trống.
   */
  @ApiProperty({
    description: 'Nội dung chi tiết của thông báo',
    example: 'Đơn đặt sân #12345 của bạn đã được xác nhận thành công.',
  })
  @IsNotEmpty()
  @IsString()
  content!: string;

  /**
   * ID của người dùng (UserProfile) sẽ nhận thông báo.
   * Phải là một UUID hợp lệ và không được để trống.
   */
  @ApiProperty({
    description: 'ID của người dùng nhận thông báo (UserProfile ID)',
    example: 'uuid-user-profile',
  })
  @IsNotEmpty()
  @IsUUID()
  recipientId!: string;
}
