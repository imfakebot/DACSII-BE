import { Body, Controller, HttpCode, HttpStatus, Post, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CheckPriceResponseDto } from './dto/check-price-response.dto';
import { CheckPriceDto } from './dto/check-price.dto';

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
    this.logger.log(`Checking price and availability for DTO: ${JSON.stringify(checkPriceDto)}`);
    return this.pricingService.checkPriceAndAvailability(checkPriceDto);
  }
}
