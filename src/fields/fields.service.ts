import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from './entities/field.entity';
import { Address } from '../locations/entities/address.entity';
import { UpdateFieldDto } from '../fields/dto/update-fields.dto';
import { CreateFieldDto } from '../fields/dto/create-fields.dto';
import { UserProfile } from '../users/entities/users-profile.entity';
import { FieldType } from '../fields/entities/field-types.entity';
import { Ward } from '@/locations/entities/ward.entity';
import { City } from '@/locations/entities/city.entity';
import { ConfigService } from '@nestjs/config';
import { FieldImage } from './entities/field-image.entity';
import { FilterFieldDto } from './dto/filter-field.dto';

/**
 * @service FieldsService
 * @description Service này xử lý tất cả các logic nghiệp vụ liên quan đến sân bóng,
 * bao gồm tạo, đọc, cập nhật, và xóa (mềm) các sân bóng.
 * Nó cũng quản lý các mối quan hệ với địa chỉ, loại sân, và chủ sở hữu.
 */
@Injectable()
export class FieldsService {
  /**
   * @param {Repository<Field>} fieldRepository - Repository để tương tác với bảng 'fields'.
   * @param {Repository<Address>} addressRepository - Repository để tương tác với bảng 'addresses'.
   * @param {Repository<FieldImage>} fieldImageRepository - Repository để tương tác với bảng 'field_images'.
   * @param {ConfigService} configService - Service để truy cập các biến môi trường.
   */
  constructor(
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(FieldImage)
    private readonly fieldImageRepository: Repository<FieldImage>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method create
   * @description Tạo một sân bóng mới cùng với địa chỉ của nó trong một giao dịch (transaction).
   * Điều này đảm bảo rằng cả sân bóng và địa chỉ đều được tạo thành công hoặc không có gì được tạo.
   * @param {CreateFieldDto} createFieldDto - DTO chứa thông tin để tạo sân bóng và địa chỉ.
   * @param {UserProfile} ownerProfile - Hồ sơ người dùng của chủ sân (admin).
   * @returns {Promise<Field>} - Thực thể Field vừa được tạo.
   */
  async create(
    createFieldDto: CreateFieldDto,
    ownerProfile: UserProfile,
  ): Promise<Field> {
    const { street, wardId, cityId, fieldTypeId, ...fieldData } =
      createFieldDto;

    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu.
    return this.fieldRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const address = transactionalEntityManager.create(Address, {
          street,
          ward: { id: wardId },
          city: { id: cityId },
        });
        const savedAddress = await transactionalEntityManager.save(address);

        const newField = transactionalEntityManager.create(Field, {
          ...fieldData,
          address: savedAddress,
          fieldType: { id: fieldTypeId } as unknown as FieldType,
          owner: ownerProfile,
        });
        return transactionalEntityManager.save(newField);
      },
    );
  }

  /**
   * @method findAll
   * @description Lấy danh sách tất cả các sân bóng cùng với các thông tin liên quan.
   * @returns {Promise<Field[]>} - Một mảng các thực thể Field.
   */
  async findAll(filterDto: FilterFieldDto): Promise<Field[]> {
    const { name, latitude, longitude, radius, cityId, fieldTypeId } =
      filterDto;

    const query = this.fieldRepository.createQueryBuilder('field');

    query
      .leftJoinAndSelect('field.address', 'address')
      .leftJoinAndSelect('address.ward', 'ward')
      .leftJoinAndSelect('address.city', 'city')
      .leftJoinAndSelect('field.fieldType', 'fieldType')
      .leftJoinAndSelect('field.owner', 'owner')
      .leftJoinAndSelect('field.images', 'images');

    if (name) {
      query.andWhere('field.name ILIKE :name', { name: `%${name}%` });
    }

    if (cityId) {
      query.andWhere('city.id = :cityId', { cityId });
    }

    if (fieldTypeId) {
      query.andWhere('fieldType.id = :fieldTypeId', { fieldTypeId });
    }

    if (latitude && longitude) {
      // Công thức Haversine trong MySQL (trả về km)
      // 6371 là bán kính trái đất (km)

      query
        .addSelect(
          `(
          6371 * acos(
            cos ( radians(:userLat))
            * cos(radians( address.latitude ))
            * cos( radians( address.longitude ) - radians(:userLong))
            + sin ( radians (:userLat) )
            * sin ( radians( address.latitude ))
          )
        )`,
          'distance',
        )
        .setParameters({
          userLat: latitude,
          userLong: longitude,
          radius: radius || 10,
        })
        // Chỉ lấy sân trong bán kính cho phép
        .andWhere(
          `(
            6371 * acos (
              cos ( radians(:userLat) )
              * cos(radians( address.latitude ))
              * cos( radians( address.longitude ) - radians(:userLong) )
              + sin ( radians(:userLat) )
              * sin ( radians( address.latitude ) )
            )
          )<= :radius`,
        )
        // Sắp xếp sân gần nhất lên đầu
        .orderBy('distance', 'ASC');
    } else {
      query.orderBy('field.createdAt', 'DESC');
    }

    return query.getMany();
  }

  /**
   * @method findOne
   * @description Tìm một sân bóng cụ thể bằng ID, bao gồm tất cả các thông tin liên quan chi tiết.
   * @param {string} id - ID của sân bóng.
   * @returns {Promise<Field>} - Thực thể Field tìm thấy.
   * @throws {NotFoundException} - Nếu không tìm thấy sân bóng với ID đã cho.
   */
  async findOne(id: string): Promise<Field> {
    return this.fieldRepository.findOneOrFail({
      where: { id: id },
      relations: [
        'address',
        'address.ward',
        'address.city',
        'fieldType',
        'owner',
        'images',
        'utilities',
      ],
    });
  }

  /**
   * @method update
   * @description Cập nhật thông tin của một sân bóng hiện có.
   * Sử dụng transaction để đảm bảo các thay đổi được áp dụng một cách an toàn.
   * @param {string} id - ID của sân bóng cần cập nhật.
   * @param {UpdateFieldDto} updateFieldDto - DTO chứa dữ liệu cần cập nhật.
   * @returns {Promise<Field>} - Thực thể Field sau khi đã được cập nhật.
   * @throws {NotFoundException} - Nếu sân bóng không tồn tại.
   */
  async update(id: string, updateFieldDto: UpdateFieldDto): Promise<Field> {
    const { street, wardId, cityId, fieldTypeId, ...fieldData } =
      updateFieldDto;

    // Tải sân bóng và địa chỉ hiện tại của nó
    const field = await this.fieldRepository.findOne({
      where: { id },
      relations: ['address'],
    });

    if (!field) {
      throw new NotFoundException(`Sân bóng với ID ${id} không tồn tại`);
    }

    // Sử dụng transaction để đảm bảo an toàn
    return this.fieldRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Cập nhật các thông tin cơ bản của sân bóng
        transactionalEntityManager.merge(Field, field, fieldData);

        // 2. Cập nhật loại sân nếu được cung cấp
        if (fieldTypeId) {
          field.fieldType = { id: fieldTypeId } as unknown as FieldType;
        }

        // 3. Cập nhật địa chỉ nếu được cung cấp
        if (field.address && (street || wardId || cityId)) {
          const addressToUpdate = field.address;
          if (street) addressToUpdate.street = street;
          if (wardId) addressToUpdate.ward = { id: wardId } as Ward;
          if (cityId) addressToUpdate.city = { id: cityId } as City;
          await transactionalEntityManager.save(addressToUpdate);
        }

        // Lưu lại toàn bộ thực thể Field đã được cập nhật
        return transactionalEntityManager.save(field);
      },
    );
  }

  /**
   * @method remove
   * @description Xóa mềm (soft delete) một sân bóng.
   * Dữ liệu không bị xóa vĩnh viễn khỏi CSDL mà chỉ được đánh dấu là đã xóa.
   * @param {string} id - ID của sân bóng cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận đã xóa.
   */
  async remove(id: string): Promise<{ message: string }> {
    const field = await this.findOne(id); // Tái sử dụng findOne để kiểm tra tồn tại

    await this.fieldRepository.softRemove(field);

    return { message: `Đã xóa thành công sân bóng với ID ${id}` };
  }

  /**
   * @method restore
   * @description Khôi phục một sân bóng đã bị xóa mềm.
   * @param {string} id - ID của sân bóng cần khôi phục.
   * @returns {Promise<Field>} - Thực thể Field sau khi đã được khôi phục.
   */
  async restore(id: string): Promise<Field> {
    await this.fieldRepository.restore(id);
    return this.findOne(id);
  }

  /**
   * @method addImagesToField
   * @description Thêm một hoặc nhiều hình ảnh cho một sân bóng cụ thể.
   * Các tệp hình ảnh được tải lên, sau đó URL của chúng được tạo và lưu vào cơ sở dữ liệu.
   * @param {string} fieldID - ID của sân bóng để thêm hình ảnh.
   * @param {Array<Express.Multer.File>} files - Mảng các tệp hình ảnh đã được tải lên.
   * @returns {Promise<FieldImage[]>} - Danh sách các thực thể FieldImage đã được tạo và lưu.
   * @throws {NotFoundException} - Nếu không tìm thấy sân bóng với ID đã cho.
   */
  async addImagesToField(
    fieldID: string,
    files: Array<Express.Multer.File>,
  ): Promise<FieldImage[]> {
    // 1. Kiểm tra xem sân bóng có tồn tại không
    const field = await this.fieldRepository.findOneBy({ id: fieldID });
    if (!field) {
      // (Quan trọng) Cần có cơ chế xóa các file đã upload nếu sân không tồn tại
      // fs.unlinkSync(file.path) for each file
      throw new NotFoundException(`Sân bóng với ID ${fieldID} không tồn tại.`);
    }
    const baseUrl = this.configService.get<string>('BASE_URL'); // Ví dụ: BASE_URL=http://localhost:3000

    // 2. Lặp qua từng file và tạo bản ghi trong CSDL
    const imagePromises = files.map((file) => {
      const imageUrl = `${baseUrl}/uploads/${file.filename}`;

      const newImage = this.fieldImageRepository.create({
        image_url: imageUrl,
        field: { id: fieldID } as Field, // Tạo mối quan hệ
        // Bạn có thể thêm logic để set isCover cho ảnh đầu tiên
      });

      return this.fieldImageRepository.save(newImage);
    });

    // 3. Chờ tất cả các thao tác lưu hoàn tất và trả về kết quả
    return Promise.all(imagePromises);
  }
}
