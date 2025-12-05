import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyFeedbackDto {
    @IsNotEmpty()
    @IsString()
    content!: string;
}