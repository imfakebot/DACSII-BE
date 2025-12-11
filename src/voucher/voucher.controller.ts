import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Query,
  UseGuards,
  ParseFloatPipe,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '@/auth/enums/role.enum';
import { Voucher } from './entities/voucher.entity';

/**
 * @class VoucherController
 * @description Xử lý các request liên quan đến mã giảm giá (voucher).
 */
@ApiTags('Vouchers (Mã giảm giá)')
@Controller('voucher')
export class VoucherController {
  private readonly logger = new Logger(VoucherController.name);
  constructor(private readonly voucherService: VoucherService) {}

  /**
   * (Admin) Endpoint để tạo một voucher mới.
   * Yêu cầu quyền Admin.
   * @param {CreateVoucherDto} dto - Dữ liệu để tạo voucher.
   * @returns {Promise<Voucher>} Voucher vừa được tạo.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Tạo mã giảm giá mới' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tạo voucher thành công.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ hoặc voucher đã tồn tại.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Chưa đăng nhập.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền Admin.',
  })
  create(@Body() dto: CreateVoucherDto) {
    this.logger.log(`Admin creating new voucher with DTO: ${JSON.stringify(dto)}`);
    return this.voucherService.create(dto);
  }

  /**
   * (Public) Lấy danh sách các voucher có sẵn cho người dùng lựa chọn.
   * @param orderValue Giá trị đơn hàng để lọc các voucher phù hợp.
   * @returns Danh sách các voucher có thể sử dụng.
   */
  @Get('available')
  @ApiOperation({
    summary: '(Public) Lấy danh sách voucher có thể sử dụng',
  })
  @ApiQuery({
    name: 'orderValue',
    type: Number,
    description: 'Giá trị đơn hàng hiện tại để lọc voucher phù hợp',
    example: 300000,
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các voucher hợp lệ.',
    type: [Voucher],
  })
  findAvailable(
    @Query('orderValue', ParseFloatPipe) orderValue: number,
  ): Promise<Voucher[]> {
    this.logger.log(`Fetching available vouchers for order value: ${orderValue}`);
    return this.voucherService.findAvailableVouchers(orderValue);
  }

  /**
   * (Public) Endpoint để kiểm tra tính hợp lệ của voucher.
   * Không yêu cầu đăng nhập, bất kỳ ai cũng có thể gọi.
   * @param {string} code - Mã voucher cần kiểm tra.
   * @param {number} orderValue - Giá trị đơn hàng hiện tại để xét điều kiện.
   * @returns {Promise<object>} Kết quả kiểm tra và thông tin giảm giá.
   */
  @Get('check')
  @ApiOperation({ summary: '(Public) Kiểm tra mã giảm giá' })
  @ApiQuery({
    name: 'code',
    type: String,
    description: 'Mã voucher',
    example: 'SALE50K',
  })
  @ApiQuery({
    name: 'orderValue',
    type: Number,
    description: 'Giá trị đơn hàng',
    example: 500000,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về kết quả kiểm tra voucher.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voucher không tồn tại.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Voucher không hợp lệ (hết hạn, hết lượt, không đủ điều kiện...).',
  })
  check(
    @Query('code') code: string,
    @Query('orderValue', ParseFloatPipe) orderValue: number,
  ): Promise<object> {
    this.logger.log(`Checking voucher code "${code}" for order value: ${orderValue}`);
    return this.voucherService.checkVoucher(code, Number(orderValue));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '(Admin) Xóa mã giảm giá' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Admin deleting voucher with ID: ${id}`);
    return this.voucherService.remove(id);
  }
}
