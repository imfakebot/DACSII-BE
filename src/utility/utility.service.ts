import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utility } from '@/utility/entities/utility.entity';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';

/**
 * @class UtilityService
 * @description Service để quản lý các tiện ích (utilities) và sản phẩm bán tại sân.
 * Chịu trách nhiệm cho các thao tác CRUD, ghi nhận và thống kê doanh thu bán hàng.
 */
@Injectable()
export class UtilityService {
  private readonly logger = new Logger(UtilityService.name);
  /**
   * @constructor
   * @param {Repository<Utility>} utilityRepository - Repository cho thực thể Utility.
   */
  constructor(
    @InjectRepository(Utility)
    private readonly utilityRepository: Repository<Utility>,
  ) {}

  /**
   * @method create
   * @description (Admin) Tạo một tiện ích hoặc sản phẩm mới.
   * @param {CreateUtilityDto} createUtilityDto - DTO chứa thông tin để tạo tiện ích.
   * @returns {Promise<Utility>} - Tiện ích vừa được tạo.
   */
  async create(createUtilityDto: CreateUtilityDto): Promise<Utility> {
    this.logger.log(`Creating utility with DTO: ${JSON.stringify(createUtilityDto)}`);
    const utility = this.utilityRepository.create(createUtilityDto);
    const savedUtility = this.utilityRepository.save(utility);
    this.logger.log(`Utility ${utility.id} created successfully.`);
    return savedUtility;
  }

  /**
   * @method findAll
   * @description (Public) Lấy danh sách tất cả các tiện ích và sản phẩm.
   * @returns {Promise<Utility[]>} - Danh sách các tiện ích.
   */
  async findAll(): Promise<Utility[]> {
    this.logger.log('Fetching all utilities.');
    return this.utilityRepository.find();
  }

  /**
   * @method findOne
   * @description (Public) Tìm một tiện ích/sản phẩm bằng ID.
   * @param {number} id - ID của tiện ích.
   * @returns {Promise<Utility>} - Thông tin chi tiết của tiện ích.
   * @throws {NotFoundException} Nếu không tìm thấy tiện ích.
   */
  async findOne(id: number): Promise<Utility> {
    this.logger.log(`Fetching utility with ID: ${id}`);
    const utility = await this.utilityRepository.findOne({ where: { id } });
    if (!utility) {
      this.logger.warn(`Utility with ID ${id} not found.`);
      throw new NotFoundException(`Utility with ID ${id} not found`);
    }
    return utility;
  }

  /**
   * @method update
   * @description (Admin) Cập nhật thông tin một tiện ích/sản phẩm.
   * @param {number} id - ID của tiện ích cần cập nhật.
   * @param {UpdateUtilityDto} updateUtilityDto - DTO chứa thông tin cập nhật.
   * @returns {Promise<Utility>} - Tiện ích sau khi đã được cập nhật.
   */
  async update(
    id: number,
    updateUtilityDto: UpdateUtilityDto,
  ): Promise<Utility> {
    this.logger.log(`Updating utility ${id} with DTO: ${JSON.stringify(updateUtilityDto)}`);
    const utility = await this.findOne(id);
    this.utilityRepository.merge(utility, updateUtilityDto);
    const updatedUtility = this.utilityRepository.save(utility);
    this.logger.log(`Utility ${id} updated successfully.`);
    return updatedUtility;
  }

  /**
   * @method remove
   * @description (Admin) Xóa một tiện ích/sản phẩm.
   * @param {number} id - ID của tiện ích cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa thành công.
   * @throws {NotFoundException} Nếu không tìm thấy tiện ích.
   */
  async remove(id: number): Promise<{ message: string }> {
    this.logger.log(`Deleting utility with ID: ${id}`);
    const result = await this.utilityRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`Utility with ID ${id} not found for deletion.`);
      throw new NotFoundException(`Utility with ID ${id} not found`);
    }
    this.logger.log(`Utility with ID ${id} removed successfully.`);
    return { message: `Utility with ID ${id} has been removed` };
  }
}
