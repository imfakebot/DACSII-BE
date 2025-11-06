import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class VerifyEmailDto {
    @IsNotEmpty({ message: 'Verification code is required' })
    @IsString()
    @Length(6, 6, { message: 'Verification code must be 6 characters long' })
    verificationCode?: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;

}