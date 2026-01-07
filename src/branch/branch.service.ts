import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { Address } from '@/location/entities/address.entity';
import { City } from '@/location/entities/city.entity';
import { Ward } from '@/location/entities/ward.entity';
import { GeocodingService } from '@/location/geocoding.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Role as RoleEnum } from '@/auth/enums/role.enum';
import { Account } from '@/user/entities/account.entity';
import { IsNull } from 'typeorm';

/**
 * @class BranchService
 * @description Service to handle business logic for branches.
 */
@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  /**
   * @constructor
   * @param {Repository<Branch>} branchRepository - Repository for the Branch entity.
   * @param {Repository<Address>} addressRepository - Repository for the Address entity.
   * @param {Repository<City>} cityRepository - Repository for the City entity.
   * @param {Repository<Ward>} wardRepository - Repository for the Ward entity.
   * @param {Repository<UserProfile>} userProfileRepository - Repository for the UserProfile entity.
   * @param {GeocodingService} geocodingService - Service for geocoding addresses.
   * @param {DataSource} dataSource - The data source for managing transactions.
   */
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly geocodingService: GeocodingService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * @method create
   * @description Creates a new branch with its address and optionally assigns a manager.
   * @param {CreateBranchDto} createBranchDto - The data to create the branch.
   * @param {Account} creator - The account of the user creating the branch.
   * @returns {Promise<Branch>} The newly created branch.
   */
  async create(
    createBranchDto: CreateBranchDto,
    creator: Account,
  ): Promise<Branch> {
    this.logger.log(
      `Admin ${creator.id} creating new branch: ${createBranchDto.name}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        street,
        wardId,
        cityId,
        manager_id,
        latitude,
        longitude,
        ...branchData
      } = createBranchDto;

      // 1. Validate Address Components
      const city = await this.cityRepository.findOneBy({ id: cityId });
      if (!city)
        throw new NotFoundException(`City with ID ${cityId} not found.`);

      const ward = await this.wardRepository.findOneBy({ id: wardId });
      if (!ward)
        throw new NotFoundException(`Ward with ID ${wardId} not found.`);

      // 2. Geocode address
      let coordinates: { latitude: number; longitude: number } | null = null;
      if (latitude !== undefined && longitude !== undefined) {
        this.logger.log(
          `Using provided coordinates: [${latitude}, ${longitude}]`,
        );
        coordinates = { latitude, longitude };
      } else {
        coordinates = await this.geocodingService.geocode({
          street,
          ward: ward.name,
          city: city.name,
        });
        if (!coordinates) {
          this.logger.error(
            `Could not geocode address for: ${street}, ${ward.name}, ${city.name}`,
          );
          throw new BadRequestException(
            'Không thể tự động xác định tọa độ từ địa chỉ. Vui lòng cung cấp kinh độ (longitude) và vĩ độ (latitude) theo cách thủ công.',
          );
        }
      }

      // 3. Create and save Address
      const newAddress = this.addressRepository.create({
        street,
        ward,
        city,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      });
      const savedAddress = await queryRunner.manager.save(newAddress);

      // 4. Validate Manager (if provided)
      let managerProfile: UserProfile | null = null;
      if (manager_id) {
        managerProfile = await this.userProfileRepository.findOne({
          where: { id: manager_id },
          relations: ['account', 'account.role'],
        });
        if (!managerProfile) {
          throw new NotFoundException(
            `User profile with ID ${manager_id} not found.`,
          );
        }
        if (managerProfile.account.role.name !== String(RoleEnum.Manager)) {
          throw new BadRequestException(
            `User with ID ${manager_id} is not a Manager.`,
          );
        }
      }

      // 5. Create and save Branch
      const newBranch = queryRunner.manager.create(Branch, {
        ...branchData,
        address: savedAddress,
        manager: managerProfile || undefined,
        manager_id: manager_id || null,
        created_by: creator.userProfile,
      });
      const savedBranch = await queryRunner.manager.save(Branch, newBranch);

      // If a manager was assigned, update their profile to link them to this new branch.
      if (managerProfile) {
        await queryRunner.manager.update(UserProfile, managerProfile.id, {
          branch: savedBranch,
        });
        this.logger.log(
          `Updated manager ${managerProfile.id} to be assigned to new branch ${savedBranch.id}`,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Branch ${savedBranch.id} created successfully.`);
      return this.findOne(savedBranch.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error creating branch:', (error as Error).stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @method findAll
   * @description Retrieves all branches with their address and manager information.
   * @returns {Promise<Branch[]>} A list of all branches.
   */
  async findAll(): Promise<Branch[]> {
    return this.branchRepository.find({
      relations: ['address', 'address.ward', 'address.city', 'manager', 'manager.account'],
    });
  }

  /**
   * @method findAvailableManagers
   * @description Finds user profiles with the 'Manager' role who are not yet assigned to any branch.
   * @returns {Promise<UserProfile[]>} A list of available managers.
   */
  async findAvailableManagers(): Promise<UserProfile[]> {
    this.logger.log('Fetching available managers');
    return this.userProfileRepository.find({
      where: {
        account: {
          role: {
            name: RoleEnum.Manager,
          },
        },
        branch: IsNull(), // Only find managers not yet assigned to a branch
      },
    });
  }

  /**
   * @method findOne
   * @description Finds a single branch by its ID, including related entities.
   * @param {string} id - The ID of the branch to find.
   * @returns {Promise<Branch>} The found branch.
   * @throws {NotFoundException} If the branch with the given ID is not found.
   */
  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: [
        'address',
        'address.ward',
        'address.city',
        'manager',
        'fields',
        'staffMembers',
      ],
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found.`);
    }
    return branch;
  }

  /**
   * @method update
   * @description Updates a branch's information.
   * @param {string} id - The ID of the branch to update.
   * @param {UpdateBranchDto} updateBranchDto - The data to update the branch with.
   * @returns {Promise<Branch>} The updated branch.
   */
  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
    const { street, wardId, cityId, manager_id, latitude, longitude, ...branchData } =
      updateBranchDto;

    // Update address if any address field is provided
    if (street !== undefined || wardId !== undefined || cityId !== undefined || latitude !== undefined || longitude !== undefined) {
      const address = branch.address;
      if (address) {
        // Update street if provided
        if (street !== undefined) {
          address.street = street;
        }

        // Update ward if provided
        if (wardId !== undefined) {
          const ward = await this.wardRepository.findOne({ where: { id: wardId } });
          if (ward) {
            address.ward = ward;
          }
        }

        // Update city if provided
        if (cityId !== undefined) {
          const city = await this.cityRepository.findOne({ where: { id: cityId } });
          if (city) {
            address.city = city;
          }
        }

        // Update coordinates if provided
        if (latitude !== undefined) {
          address.latitude = latitude;
        }
        if (longitude !== undefined) {
          address.longitude = longitude;
        }

        await this.addressRepository.save(address);
        this.logger.log(`Address updated for branch ${id}`);
      }
    }

    // Update manager if provided
    if (manager_id !== undefined) {
      if (manager_id === null) {
        // Remove manager assignment
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        branch.manager = null as any;
        branch.manager_id = null;
      } else {
        const managerProfile = await this.userProfileRepository.findOne({
          where: { id: manager_id },
          relations: ['account', 'account.role'],
        });
        if (managerProfile) {
          branch.manager = managerProfile;
          branch.manager_id = manager_id;
        }
      }
    }

    this.branchRepository.merge(branch, branchData);
    await this.branchRepository.save(branch);

    return this.findOne(id);
  }

  /**
   * @method remove
   * @description Deletes a branch by its ID.
   * @param {string} id - The ID of the branch to delete.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {NotFoundException} If the branch with the given ID is not found.
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.branchRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Branch with ID ${id} not found.`);
    }
    return { message: 'Branch deleted successfully.' };
  }
}
