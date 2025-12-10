import { Injectable, NotFoundException } from '@nestjs/common';
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
    const utility = this.utilityRepository.create(createUtilityDto);
    return this.utilityRepository.save(utility);
  }

  /**
   * @method findAll
   * @description (Public) Lấy danh sách tất cả các tiện ích và sản phẩm.
   * @returns {Promise<Utility[]>} - Danh sách các tiện ích.
   */
  async findAll(): Promise<Utility[]> {
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
    const utility = await this.utilityRepository.findOne({ where: { id } });
    if (!utility) {
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
    const utility = await this.findOne(id);
    this.utilityRepository.merge(utility, updateUtilityDto);
    return this.utilityRepository.save(utility);
  }

  /**
   * @method remove
   * @description (Admin) Xóa một tiện ích/sản phẩm.
   * @param {number} id - ID của tiện ích cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa thành công.
   * @throws {NotFoundException} Nếu không tìm thấy tiện ích.
   */
  async remove(id: number): Promise<{ message: string }> {
    const result = await this.utilityRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Utility with ID ${id} not found`);
    }
    return { message: `Utility with ID ${id} has been removed` };
  }
}
