// dto/create-employee.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '../enum/gender.enum';

export class CreateEmployeeDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password!: string;

    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber?: string;

    @IsOptional()
    gender?: Gender;

    @IsOptional()
    bio?: string;

    // Chỉ bắt buộc nếu người tạo là Admin (để chỉ định chi nhánh cho Manager)
    @IsString()
    @IsOptional()
    branchId?: string;
}