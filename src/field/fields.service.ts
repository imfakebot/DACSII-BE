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

@Injectable()
export class FieldsService {
  private readonly logger = new Logger(FieldsService.name);

  constructor(
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(FieldImage)
    private readonly fieldImageRepository: Repository<FieldImage>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly configService: ConfigService,
  ) { }

  /**
   * @method create
   * @description Tạo sân bóng mới thuộc về một Chi nhánh cụ thể.
   */
  async create(createFieldDto: CreateFieldDto, userProfile: UserProfile): Promise<Field> {
    const { branchId, fieldTypeId, ...fieldData } = createFieldDto;

    // 1. Kiểm tra Chi nhánh có tồn tại không
    const branch: Branch | null = await this.branchRepository.findOne({
      where: {
       
        id: branchId
      },
      relations: ['manager'],
    });

    if (!branch) {
      throw new NotFoundException('Chi nhánh hoặc người quản lý của chi nhánh không tồn tại.');
    }

    // 2. (Optional) Kiểm tra quyền: Chỉ Manager của chi nhánh này (hoặc Admin) mới được thêm sân
    if (branch.manager.id !== userProfile.id && userProfile.role !== 'super_admin') {
      throw new ForbiddenException('Bạn không có quyền thêm sân vào chi nhánh này');
    }

    // 3. Tạo sân mới
    const newField = this.fieldRepository.create({
      ...fieldData,
      branch: branch,
      fieldType: { id: fieldTypeId } as FieldType,
    });

    return this.fieldRepository.save(newField);
  }

  /**
   * @method findAll
   * @description Tìm kiếm sân bóng (Hỗ trợ lọc theo Chi nhánh, Vị trí).
   */
  async findAll(filterDto: FilterFieldDto): Promise<Field[]> {
    const { name, latitude, longitude, radius, cityId, fieldTypeId, branchId } = filterDto;

    const query = this.fieldRepository.createQueryBuilder('field');

    // Join các bảng liên quan
    query
      .leftJoinAndSelect('field.fieldType', 'fieldType')
      .leftJoinAndSelect('field.images', 'images')
      .leftJoinAndSelect('field.branch', 'branch') // Join với Chi nhánh
      .leftJoinAndSelect('branch.address', 'address') // Lấy địa chỉ từ Chi nhánh
      .leftJoinAndSelect('address.ward', 'ward')
      .leftJoinAndSelect('address.city', 'city');

    // --- CÁC ĐIỀU KIỆN LỌC ---

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

    // --- TÍNH KHOẢNG CÁCH (HAVERSINE) ---
    if (latitude && longitude) {
      // Lưu ý: Tính khoảng cách tới branch.address (vì sân không có địa chỉ riêng nữa)
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

  async findOne(id: string): Promise<Field> {
    const field = await this.fieldRepository.findOne({
      where: { id },
      relations: [
        'fieldType',
        'images',
        'utilities',
        'branch',           // Lấy thông tin chi nhánh
        'branch.address',   // Lấy địa chỉ chi nhánh
        'branch.manager',   // Lấy người quản lý
      ],
    });

    if (!field) throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    return field;
  }

  async update(id: string, updateFieldDto: UpdateFieldDto): Promise<Field> {
    const field = await this.findOne(id);
    const { branchId, fieldTypeId, ...fieldData } = updateFieldDto;

    // Cập nhật thông tin cơ bản
    this.fieldRepository.merge(field, fieldData);

    // Cập nhật loại sân
    if (fieldTypeId) {
      field.fieldType = { id: fieldTypeId } as FieldType;
    }

    // Cập nhật chi nhánh (Chuyển sân sang cơ sở khác)
    if (branchId) {
      const branch: Branch | null = await this.branchRepository.findOneBy({
        id: branchId
      });
      if (!branch) throw new BadRequestException("Chi nhánh mới không tồn tại");
      field.branch = branch; // Safe assignment: branch is guaranteed to be a Branch object here.
    }

    return this.fieldRepository.save(field);
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.fieldRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    }
    return { message: 'Đã xóa sân bóng thành công' };
  }

  async addImagesToField(fieldID: string, files: Array<Express.Multer.File>): Promise<FieldImage[]> {
    const field = await this.fieldRepository.findOneBy({ id: fieldID });
    if (!field) throw new NotFoundException(`Sân bóng không tồn tại`);

    const baseUrl = this.configService.get<string>('BASE_URL');

    const images = files.map(file => this.fieldImageRepository.create({

      image_url: `${baseUrl}/uploads/${file.filename}`,
      field: field
    }));

    return this.fieldImageRepository.save(images);
  }

  // Hàm Geocoding đã chuyển sang BranchService, không cần ở đây nữa
  // Vì địa chỉ gắn với Branch, không phải Field.
}