import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from './entities/field.entity';
import { CreateFieldDto } from './dto/create-fields.dto'; // Nhớ cập nhật DTO này
import { UpdateFieldDto } from './dto/update-fields.dto';
import { FieldType } from './entities/field-types.entity';
import { FilterFieldDto } from './dto/filter-field.dto';
import { FieldImage } from './entities/field-image.entity';
import { ConfigService } from '@nestjs/config';
import { Branch } from '@/branch/entities/branch.entity';
import { UserProfile } from '../user/entities/users-profile.entity';

/**
 * @class FieldsService
 * @description Service xử lý logic nghiệp vụ liên quan đến sân bóng.
 */
@Injectable()
export class FieldsService {
  private readonly logger = new Logger(FieldsService.name);

  /**
   * @constructor
   * @param {Repository<Field>} fieldRepository - Repository cho thực thể Field.
   * @param {Repository<FieldImage>} fieldImageRepository - Repository cho thực thể FieldImage.
   * @param {Repository<Branch>} branchRepository - Repository cho thực thể Branch.
   * @param {ConfigService} configService - Service để truy cập biến môi trường.
   */
  constructor(
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(FieldImage)
    private readonly fieldImageRepository: Repository<FieldImage>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method create
   * @description Tạo sân bóng mới thuộc về một chi nhánh cụ thể.
   * @param {CreateFieldDto} createFieldDto - DTO chứa thông tin để tạo sân.
   * @param {UserProfile} userProfile - Hồ sơ người dùng của người tạo (để kiểm tra quyền).
   * @returns {Promise<Field>} - Sân bóng vừa được tạo.
   */
  async create(
    createFieldDto: CreateFieldDto,
    userProfile: UserProfile,
  ): Promise<Field> {
    const { branchId, fieldTypeId, ...fieldData } = createFieldDto;

    const branch: Branch | null = await this.branchRepository.findOne({
      where: { id: branchId },
      relations: ['manager'],
    });

    if (!branch) {
      throw new NotFoundException(
        'Chi nhánh hoặc người quản lý của chi nhánh không tồn tại.',
      );
    }

    if (
      branch.manager.id !== userProfile.id &&
      userProfile.role !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm sân vào chi nhánh này',
      );
    }

    const newField = this.fieldRepository.create({
      ...fieldData,
      branch: branch,
      fieldType: { id: fieldTypeId } as FieldType,
    });

    return this.fieldRepository.save(newField);
  }

  /**
   * @method findAll
   * @description Tìm kiếm và lọc danh sách các sân bóng.
   * Hỗ trợ lọc theo tên, chi nhánh, loại sân, thành phố và tìm kiếm theo vị trí địa lý.
   * @param {FilterFieldDto} filterDto - DTO chứa các tham số lọc.
   * @returns {Promise<Field[]>} - Danh sách các sân bóng phù hợp.
   */
  async findAll(filterDto: FilterFieldDto): Promise<Field[]> {
    const { name, latitude, longitude, radius, cityId, fieldTypeId, branchId } =
      filterDto;

    const query = this.fieldRepository.createQueryBuilder('field');

    query
      .leftJoinAndSelect('field.fieldType', 'fieldType')
      .leftJoinAndSelect('field.images', 'images')
      .leftJoinAndSelect('field.branch', 'branch')
      .leftJoinAndSelect('branch.address', 'address')
      .leftJoinAndSelect('address.ward', 'ward')
      .leftJoinAndSelect('address.city', 'city');

    if (branchId) {
      query.andWhere('branch.id = :branchId', { branchId });
    }
    if (name) {
      query.andWhere('field.name ILIKE :name', { name: `%${name}%` });
    }
    if (fieldTypeId) {
      query.andWhere('fieldType.id = :fieldTypeId', { fieldTypeId });
    }
    if (cityId) {
      query.andWhere('city.id = :cityId', { cityId });
    }

    if (latitude && longitude) {
      query
        .addSelect(
          `(6371 * acos(
            cos(radians(:userLat))
            * cos(radians(address.latitude))
            * cos(radians(address.longitude) - radians(:userLong))
            + sin(radians(:userLat))
            * sin(radians(address.latitude))
          ))`,
          'distance',
        )
        .setParameters({
          userLat: latitude,
          userLong: longitude,
          radius: radius || 10,
        })
        .andWhere(
          `(6371 * acos(
            cos(radians(:userLat))
            * cos(radians(address.latitude))
            * cos(radians(address.longitude) - radians(:userLong))
            + sin(radians(:userLat))
            * sin(radians(address.latitude))
          )) <= :radius`,
        )
        .orderBy('distance', 'ASC');
    } else {
      query.orderBy('field.createdAt', 'DESC');
    }

    return query.getMany();
  }

  /**
   * @method findOne
   * @description Tìm thông tin chi tiết của một sân bóng bằng ID.
   * @param {string} id - ID của sân bóng.
   * @returns {Promise<Field>} - Thông tin chi tiết của sân bóng.
   * @throws {NotFoundException} Nếu không tìm thấy sân bóng.
   */
  async findOne(id: string): Promise<Field> {
    const field = await this.fieldRepository.findOne({
      where: { id },
      relations: [
        'fieldType',
        'images',
        'utilities',
        'branch',
        'branch.address',
        'branch.manager',
      ],
    });

    if (!field) throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    return field;
  }

  /**
   * @method update
   * @description Cập nhật thông tin của một sân bóng.
   * @param {string} id - ID của sân bóng cần cập nhật.
   * @param {UpdateFieldDto} updateFieldDto - DTO chứa thông tin cập nhật.
   * @returns {Promise<Field>} - Sân bóng sau khi đã được cập nhật.
   */
  async update(id: string, updateFieldDto: UpdateFieldDto): Promise<Field> {
    const field = await this.findOne(id);
    const { branchId, fieldTypeId, ...fieldData } = updateFieldDto;

    this.fieldRepository.merge(field, fieldData);

    if (fieldTypeId) {
      field.fieldType = { id: fieldTypeId } as FieldType;
    }

    if (branchId) {
      const branch: Branch | null = await this.branchRepository.findOneBy({
        id: branchId,
      });
      if (!branch) throw new BadRequestException('Chi nhánh mới không tồn tại');
      field.branch = branch;
    }

    return this.fieldRepository.save(field);
  }

  /**
   * @method remove
   * @description Xóa mềm một sân bóng.
   * @param {string} id - ID của sân bóng cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa thành công.
   * @throws {NotFoundException} Nếu không tìm thấy sân bóng.
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.fieldRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    }
    return { message: 'Đã xóa sân bóng thành công' };
  }

  /**
   * @method addImagesToField
   * @description Thêm một hoặc nhiều hình ảnh cho một sân bóng.
   * @param {string} fieldID - ID của sân bóng.
   * @param {Array<Express.Multer.File>} files - Mảng các file ảnh được tải lên.
   * @returns {Promise<FieldImage[]>} - Mảng các đối tượng hình ảnh vừa được lưu.
   */
  async addImagesToField(
    fieldID: string,
    files: Array<Express.Multer.File>,
  ): Promise<FieldImage[]> {
    const field = await this.fieldRepository.findOneBy({ id: fieldID });
    if (!field) throw new NotFoundException(`Sân bóng không tồn tại`);

    const baseUrl = this.configService.get<string>('BASE_URL');

    const images = files.map((file) =>
      this.fieldImageRepository.create({
        image_url: `${baseUrl}/uploads/${file.filename}`,
        field: field,
      }),
    );

    return this.fieldImageRepository.save(images);
  }
}
