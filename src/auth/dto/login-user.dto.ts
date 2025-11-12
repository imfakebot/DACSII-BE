import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginUserDto{
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password?: string;
}