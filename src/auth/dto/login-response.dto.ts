import { ApiProperty } from '@nestjs/swagger';

/**
 * @class UserResponseDto
 * @description DTO chứa thông tin tối giản của người dùng trả về cho client.
 */
export class UserResponseDto {
  @ApiProperty({ example: 'uuid-123-456' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'CUSTOMER' })
  role!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: true })
  is_profile_complete!: boolean;

  @ApiProperty({
    description: 'Thông tin chi nhánh (nếu có)',
    required: false,
    example: { branchId: 'uuid-branch-789' }
  })
  branch?: {
    branchId?: string;
  };
}

/**
 * @class LoginResponseDto
 * @description DTO cho phản hồi đăng nhập thành công.
 */
export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Access Token dùng để truy cập các tài nguyên bảo mật' })
  accessToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
