import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Repository } from 'typeorm';
import { Ward } from './entities/ward.entity';

/**
 * @class LocationsService
 * @description Service xử lý logic nghiệp vụ liên quan đến địa điểm (tỉnh/thành, quận/huyện, phường/xã).
 */
@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);
  /**
   * @constructor
   * @param {Repository<City>} cityRepository - Repository cho thực thể City.
   * @param {Repository<Ward>} wardRepository - Repository cho thực thể Ward.
   */
  constructor(
    @InjectRepository(City) private cityRepository: Repository<City>,
    @InjectRepository(Ward) private wardRepository: Repository<Ward>,
  ) {}

  /**
   * @method findAll
   * @description Lấy danh sách tất cả các tỉnh/thành phố.
   * @returns {Promise<City[]>} - Mảng các đối tượng City.
   */
  async findAll(): Promise<City[]> {
    this.logger.log('Fetching all cities');
    return this.cityRepository.find();
  }

  /**
   * @method findWardsByCityId
   * @description Lấy danh sách các phường/xã thuộc một tỉnh/thành phố cụ thể.
   * @param {number} cityId - ID của tỉnh/thành phố.
   * @returns {Promise<Ward[]>} - Mảng các đối tượng Ward.
   */
  async findWardsByCityId(cityId: number): Promise<Ward[]> {
    this.logger.log(`Fetching wards for cityId: ${cityId}`);
    return this.wardRepository.find({ where: { city: { id: cityId } } });
  }
}
