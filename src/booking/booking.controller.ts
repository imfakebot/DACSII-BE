import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.controller';
import { UsersService } from '../users/users.service';
import { Booking } from './entities/booking.entity';
import { Role } from '@/auth/enums/role.enum';

@ApiTags('Bookings (Đặt sân)')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tạo yêu cầu đặt sân mới (Chốt đơn)' })
  @ApiResponse({
    status: 201,
    description: 'Đặt sân thành công (Trạng thái Pending).',
    type: Booking,
  })
  @ApiResponse({
    status: 409,
    description: 'Sân đã bị người khác đặt trong khung giờ này.',
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub;

    // 1. Lấy profile của người đang đăng nhập
    const userProfile =
      await this.usersService.findProfileByAccountId(accountId);

    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    // 2. Gọi service để xử lý đặt sân
    return this.bookingService.createBooking(createBookingDto, userProfile);
  }

  @Patch(':id/cancel') // Dùng PATCH để cập nhật trạng thái
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(User) Hủy yêu cầu đặt sân' })
  @ApiResponse({ status: 200, description: 'Hủy thành công.' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hủy đơn của người khác.',
  })
  @ApiResponse({ status: 404, description: 'Booking không tồn tại.' })
  async cancel(
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = req.user.sub; // Lấy ID người dùng đang đăng nhập
    const role =
      typeof req.user.role === 'string' ? req.user.role : req.user.role?.name;
    return this.bookingService.cancelBooking(
      bookingId,
      accountId,
      role as Role,
    );
  }
}
