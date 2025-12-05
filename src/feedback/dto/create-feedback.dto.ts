import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFeedbackDto {
    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsNotEmpty()
    @IsString()
    category!: string; // Có thể dùng Enum nếu muốn chặt chẽ

    @IsNotEmpty()
    @IsString()
    content!: string; // Nội dung tin nhắn đầu tiên
}