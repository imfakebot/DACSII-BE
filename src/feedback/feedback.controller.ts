import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { User } from '@/auth/decorator/users.decorator';
import { Account } from '@/user/entities/account.entity';
import { Role } from '@/auth/enums/role.enum';


@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
    constructor(private readonly feedbacksService: FeedbackService) { }

    // 1. Tạo Feedback
    @Post()
    create(@Body() createDto: CreateFeedbackDto, @User() account: Account) {
        return this.feedbacksService.create(createDto, account);
    }

    // 2. Xem danh sách của tôi
    @Get('me')
    findMine(@User() account: Account) {
        return this.feedbacksService.findMyFeedbacks(account);
    }

    // 3. Xem tất cả (Chỉ Admin)
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(Role.Admin, Role.Manager)
    findAll() {
        return this.feedbacksService.findAll();
    }

    // 4. Xem chi tiết hội thoại
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.feedbacksService.findOne(id);
    }

    // 5. Gửi tin nhắn trả lời
    @Post(':id/reply')
    reply(
        @Param('id') id: string,
        @Body() dto: ReplyFeedbackDto,
        @User() account: Account, // 👈 Lấy account trực tiếp
    ) {
        return this.feedbacksService.reply(id, dto, account);
    }
}