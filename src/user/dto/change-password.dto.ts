import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, NotEquals } from 'class-validator';

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
    @NotEquals('oldPassword', {
        message: 'Mật khẩu mới không được trùng với mật khẩu cũ.',
    })
    newPassword!: string;
}