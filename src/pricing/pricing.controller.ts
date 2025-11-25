import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CheckPriceResponseDto } from './dto/check-price-response.dto';
import { CheckPriceDto } from './dto/check-price.dto';

@ApiTags('Pricing(Tính giá)')
@Controller('pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Post('check-availability')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Kiểm tra giá và tình trạng sân (Dynamic Time)' })

    // QUAN TRỌNG: Khai báo type: CheckPriceResponseDto ở đây
    @ApiResponse({
        status: 200,
        description: 'Kiểm tra thành công.',
        type: CheckPriceResponseDto
    })
    checkPrice(@Body() checkPriceDto: CheckPriceDto) {
        return this.pricingService.checkPriceAndAvailability(checkPriceDto);
    }
}


