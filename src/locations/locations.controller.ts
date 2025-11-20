import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { City } from './entities/city.entity';
import { Ward } from './entities/ward.entity';
import { LocationsService } from './locations.service';

/**
 * @controller LocationsController
 * @description Xử lý các yêu cầu liên quan đến địa điểm,
 * bao gồm lấy danh sách các tỉnh/thành phố và các phường/xã.
 */
@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  /**
   * @param {LocationsService} locationsService - Service xử lý logic nghiệp vụ cho các địa điểm.
   */
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * @route GET /locations/cities
   * @description Lấy danh sách tất cả các tỉnh/thành phố có trong hệ thống.
   * @returns {Promise<City[]>} - Một mảng các thực thể City.
   */
  @Get('cities')
  @ApiOperation({ summary: 'Lấy danh sách tất cả các Thành phố' })
  @ApiResponse({ status: 200, description: 'Thành công', type: [City] })
  async findAllCities(): Promise<City[]> {
    return this.locationsService.findAll();
  }

  /**
   * @route GET /locations/wards/:cityId
   * @description Lấy danh sách tất cả các phường/xã thuộc về một tỉnh/thành phố cụ thể.
   * @param {number} cityId - ID của tỉnh/thành phố.
   * @returns {Promise<Ward[]>} - Một mảng các thực thể Ward.
   */
  @Get('wards/:cityId')
  @ApiOperation({ summary: 'Lấy danh sách Phường/Xã theo ID Thành phố' })
  @ApiResponse({ status: 200, description: 'Thành công', type: [Ward] })
  async findWardsByCityId(@Param('cityId') cityId: number): Promise<Ward[]> {
    return this.locationsService.findWardsByCityId(cityId);
  }
}
