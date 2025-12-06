import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utility } from '@/utility/entities/utility.entity';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';

/**
 * @class UtilityService
 * @description Service để quản lý các tiện ích (utilities) của sân bóng.
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
  ) { }

  /**
   * @method create
   * @description Tạo một tiện ích mới.
   * @param {CreateUtilityDto} createUtilityDto - DTO chứa thông tin để tạo tiện ích.
   * @returns {Promise<Utility>} - Tiện ích vừa được tạo.
   */
  async create(createUtilityDto: CreateUtilityDto): Promise<Utility> {
    const utility = this.utilityRepository.create(createUtilityDto);
    return this.utilityRepository.save(utility);
  }

  /**
   * @method findAll
   * @description Lấy danh sách tất cả các tiện ích.
   * @returns {Promise<Utility[]>} - Danh sách các tiện ích.
   */
  async findAll(): Promise<Utility[]> {
    return this.utilityRepository.find();
  }

  /**
   * @method findOne
   * @description Tìm một tiện ích bằng ID.
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
   * @description Cập nhật thông tin một tiện ích.
   * @param {number} id - ID của tiện ích cần cập nhật.
   * @param {UpdateUtilityDto} updateUtilityDto - DTO chứa thông tin cập nhật.
   * @returns {Promise<Utility>} - Tiện ích sau khi đã được cập nhật.
   */
  async update(id: number, updateUtilityDto: UpdateUtilityDto): Promise<Utility> {
    const utility = await this.findOne(id);
    this.utilityRepository.merge(utility, updateUtilityDto);
    return this.utilityRepository.save(utility);
  }

  /**
   * @method remove
   * @description Xóa một tiện ích.
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
