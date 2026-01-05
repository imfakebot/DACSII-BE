import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Field } from './entities/field.entity';
import { CreateFieldDto } from './dto/create-fields.dto';
import { UpdateFieldDto } from './dto/update-fields.dto';
import { FieldType } from './entities/field-types.entity';
import { FilterFieldDto } from './dto/filter-field.dto';
import { FieldImage } from './entities/field-image.entity';
import { ConfigService } from '@nestjs/config';
import { Branch } from '@/branch/entities/branch.entity';
import { UserProfile } from '../user/entities/users-profile.entity';
import { Role } from '@/auth/enums/role.enum';
import { Utility } from '../utility/entities/utility.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * @class FieldsService
 * @description Service xử lý logic nghiệp vụ liên quan đến sân bóng.
 */
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
    @InjectRepository(Utility)
    private readonly utilityRepository: Repository<Utility>,
    private readonly configService: ConfigService,
  ) { }

  async create(
    createFieldDto: CreateFieldDto,
    userProfile: UserProfile,
  ): Promise<Field> {
    this.logger.log(
      `User ${userProfile.id} is creating a new field with DTO: ${JSON.stringify(
        createFieldDto,
      )}`,
    );

    const { fieldTypeId, utilityIds, branchId, ...fieldData } = createFieldDto;
    const isAdmin = userProfile.account.role.name === String(Role.Admin);

    let branch: Branch | null;

    if (isAdmin) {
      if (!branchId) {
        throw new BadRequestException(
          'Admin phải cung cấp ID chi nhánh (branchId).',
        );
      }
      branch = await this.branchRepository.findOneBy({ id: branchId });
      if (!branch) {
        throw new NotFoundException(
          `Chi nhánh với ID ${branchId} không tồn tại.`,
        );
      }
    } else {
      branch = userProfile.branch;
      if (!branch) {
        this.logger.error(
          `Manager ${userProfile.id} is not associated with any branch.`,
        );
        throw new ForbiddenException(
          'Tài khoản Quản lý của bạn phải được gán vào một chi nhánh để có thể tạo sân bóng.',
        );
      }

      const isManagerOfBranch = branch.manager_id === userProfile.id;
      if (!isManagerOfBranch) {
        this.logger.error(
          `User ${userProfile.id} (Role: ${userProfile.account.role.name}) does not have permission to add a field to branch ${branch.id}`,
        );
        throw new ForbiddenException(
          'Bạn không phải là quản lý của chi nhánh này để thêm sân.',
        );
      }
    }

    const newField = this.fieldRepository.create({
      ...fieldData,
      branch: branch,
      fieldType: { id: fieldTypeId } as FieldType,
    });

    if (utilityIds && utilityIds.length > 0) {
      const utilities = await this.utilityRepository.findBy({
        id: In(utilityIds),
      });
      if (utilities.length !== utilityIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều ID tiện ích không hợp lệ.',
        );
      }
      newField.utilities = utilities;
    }

    const savedField = await this.fieldRepository.save(newField);
    this.logger.log(
      `Field ${savedField.id} created successfully in branch ${branch.id}`,
    );
    return this.findOne(savedField.id);
  }

  async findAll(filterDto: FilterFieldDto): Promise<Field[]> {
    this.logger.log(
      `Finding all fields with filter: ${JSON.stringify(filterDto)}`,
    );
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

    const fields = await query.getMany();
    this.logger.log(`Found ${fields.length} fields`);
    return fields;
  }

  async findOne(id: string): Promise<Field> {
    this.logger.log(`Finding field with ID: ${id}`);
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

    if (!field) {
      this.logger.error(`Field with ID ${id} not found`);
      throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    }
    return field;
  }

  async update(
    id: string,
    updateFieldDto: UpdateFieldDto,
    userProfile: UserProfile,
  ): Promise<Field> {
    this.logger.log(
      `User ${userProfile.id} updating field ${id} with DTO: ${JSON.stringify(
        updateFieldDto,
      )}`,
    );
    const field = await this.fieldRepository.findOne({
      where: { id },
      relations: ['branch', 'utilities'],
    });

    if (!field) {
      throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    }

    const isAdmin = userProfile.account.role.name === String(Role.Admin);
    if (!isAdmin) {
      if (!field.branch || field.branch.manager_id !== userProfile.id) {
        throw new ForbiddenException(
          'Bạn không có quyền cập nhật sân bóng này.',
        );
      }
    }

    const { branchId, fieldTypeId, utilityIds, ...fieldData } = updateFieldDto;

    if (!isAdmin && branchId && branchId !== field.branch.id) {
      throw new ForbiddenException('Quản lý không được phép thay đổi chi nhánh của sân.');
    }

    this.fieldRepository.merge(field, fieldData);

    if (fieldTypeId) {
      field.fieldType = { id: fieldTypeId } as FieldType;
    }

    if (branchId && isAdmin) {
      const branch: Branch | null = await this.branchRepository.findOneBy({
        id: branchId,
      });
      if (!branch) {
        this.logger.error(`Branch with ID ${branchId} not found`);
        throw new BadRequestException('Chi nhánh mới không tồn tại');
      }
      field.branch = branch;
    }

    if (utilityIds !== undefined) {
      if (utilityIds.length === 0) {
        field.utilities = [];
      } else {
        const utilities = await this.utilityRepository.findBy({
          id: In(utilityIds),
        });
        if (utilities.length !== utilityIds.length) {
          throw new BadRequestException(
            'Một hoặc nhiều ID tiện ích không hợp lệ.',
          );
        }
        field.utilities = utilities;
      }
    }

    await this.fieldRepository.save(field);
    this.logger.log(`Field ${id} updated successfully`);
    return this.findOne(id);
  }

  async remove(
    id: string,
    userProfile: UserProfile,
  ): Promise<{ message: string }> {
    this.logger.log(`User ${userProfile.id} removing field with ID: ${id}`);
    const field = await this.fieldRepository.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!field) {
      throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    }

    const isAdmin = userProfile.account.role.name === String(Role.Admin);
    if (!isAdmin) {
      if (!field.branch || field.branch.manager_id !== userProfile.id) {
        throw new ForbiddenException('Bạn không có quyền xóa sân bóng này.');
      }
    }

    const result = await this.fieldRepository.softDelete(id);
    if (result.affected === 0) {
      // This case should theoretically not be reached if findOne succeeds
      throw new NotFoundException(`Sân bóng ID ${id} không tồn tại`);
    }
    this.logger.log(`Field ${id} removed successfully by user ${userProfile.id}`);
    return { message: 'Đã xóa sân bóng thành công' };
  }

  async addImagesToField(
    fieldId: string,
    files: Array<Express.Multer.File>,
    userProfile: UserProfile,
  ): Promise<FieldImage[]> {
    this.logger.log(
      `User ${userProfile.id} adding ${files.length} images to field ${fieldId}`,
    );
    const field = await this.fieldRepository.findOne({
      where: { id: fieldId },
      relations: ['branch'],
    });
    if (!field) {
      this.logger.error(`Field with ID ${fieldId} not found for image upload`);
      throw new NotFoundException(`Sân bóng không tồn tại`);
    }

    const isAdmin = userProfile.account.role.name === String(Role.Admin);
    if (!isAdmin) {
      if (!field.branch || field.branch.manager_id !== userProfile.id) {
        throw new ForbiddenException(
          'Bạn không có quyền thêm ảnh cho sân bóng này.',
        );
      }
    }

    const baseUrl = this.configService.get<string>('BASE_URL');

    const images = files.map((file) =>
      this.fieldImageRepository.create({
        id: uuidv4(),
        image_url: `${baseUrl}/uploads/${file.filename}`,
        field: field,
      }),
    );

    const savedImages = await this.fieldImageRepository.save(images);
    this.logger.log(
      `Added ${savedImages.length} images to field ${fieldId} successfully`,
    );
    return savedImages;
  }
}
