import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Logger,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CheckPriceResponseDto } from './dto/check-price-response.dto';
import { CheckPriceDto } from './dto/check-price.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { TimeSlot } from './entities/time-slot.entity';

/**
 * @controller PricingController
 * @description Xử lý các yêu cầu liên quan đến việc tính giá và kiểm tra tính khả dụng của sân.
 */
@ApiTags('Pricing(Tính giá)')
@Controller('pricing')
export class PricingController {
  private readonly logger = new Logger(PricingController.name);
  /**
   * @constructor
   * @param {PricingService} pricingService - Service xử lý logic tính giá.
   */
  constructor(private readonly pricingService: PricingService) {}

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra giá và tình trạng sân (Dynamic Time)' })
  // QUAN TRỌNG: Khai báo type: CheckPriceResponseDto ở đây
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra thành công.',
    type: CheckPriceResponseDto,
  })
  checkPrice(@Body() checkPriceDto: CheckPriceDto) {
    this.logger.log(
      `Checking price and availability for DTO: ${JSON.stringify(
        checkPriceDto,
      )}`,
    );
    return this.pricingService.checkPriceAndAvailability(checkPriceDto);
  }

  @Get('time-slots')
  @ApiOperation({ summary: 'Lấy danh sách tất cả các khung giờ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các khung giờ.',
    type: [TimeSlot],
  })
  getTimeSlots(): Promise<TimeSlot[]> {
    this.logger.log('Received request to get all time slots.');
    return this.pricingService.getAllTimeSlots();
  }

  @Patch('time-slot/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Cập nhật khung giờ (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật khung giờ thành công.',
    type: TimeSlot,
  })
  @ApiResponse({ status: 404, description: 'Khung giờ không tồn tại.' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập.' })
  updateTimeSlot(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
  ): Promise<TimeSlot> {
    this.logger.log(`Received request to update time slot with ID: ${id}`);
    return this.pricingService.updateTimeSlot(id, updateTimeSlotDto);
  }
}
