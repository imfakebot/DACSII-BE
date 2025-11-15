import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  full_name!: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'], {
    message: 'Gender must be one of male, female, or other',
  })
  gender?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsNumber()
  ward_id?: number;

  @IsOptional()
  @IsNumber()
  city_id?: number;
}
