import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ReplyFeedbackDto } from './dto/reply-feedback.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { User } from '@/auth/decorator/users.decorator';
import { Account } from '@/user/entities/account.entity';
import { Role } from '@/auth/enums/role.enum';

@ApiTags('Feedbacks (Hỗ trợ & Góp ý)')
@ApiBearerAuth()
@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbacksService: FeedbackService) {}

  // 1. Tạo Feedback
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '(User) Tạo một ticket feedback/hỗ trợ mới' })
  @ApiResponse({ status: 201, description: 'Tạo ticket thành công.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createDto: CreateFeedbackDto, @User() account: Account) {
    return this.feedbacksService.create(createDto, account);
  }

  // 2. Xem danh sách của tôi
  @Get('me')
  @ApiOperation({ summary: '(User) Xem danh sách các ticket của tôi' })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách các ticket của người dùng.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findMine(@User() account: Account) {
    return this.feedbacksService.findMyFeedbacks(account);
  }

  // 3. Xem tất cả (Chỉ Admin/Manager)
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: '(Admin/Manager) Xem tất cả các ticket' })
  @ApiResponse({ status: 200, description: 'Trả về tất cả các ticket.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll() {
    return this.feedbacksService.findAll();
  }

  // 4. Xem chi tiết hội thoại
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một cuộc hội thoại trong ticket' })
  @ApiResponse({ status: 200, description: 'Trả về chi tiết ticket.' })
  @ApiResponse({ status: 404, description: 'Ticket not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedbacksService.findOne(id);
  }

  // 5. Gửi tin nhắn trả lời
  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn trả lời trong một ticket' })
  @ApiResponse({ status: 201, description: 'Gửi trả lời thành công.' })
  @ApiResponse({ status: 404, description: 'Ticket not found.' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyFeedbackDto,
    @User() account: Account, // 👈 Lấy account trực tiếp
  ) {
    return this.feedbacksService.reply(id, dto, account);
  }
}
