import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginCompleteDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Mã OTP gồm 6 ký tự nhận được từ email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  verificationCode!: string;
}
