import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Mật khẩu hiện tại của người dùng',
    example: 'oldPassword123',
  })
  @IsString()
  oldPassword!: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
    example: 'newStrongPassword!@#',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
  newPassword!: string;
}
