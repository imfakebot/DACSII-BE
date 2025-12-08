import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utility } from '@/utility/entities/utility.entity';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';
import { UtilitySale } from './entities/utility-sale.entity';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';
import { RecordSaleDto } from './dto/record-sale.dto';
import { UsersService } from '@/user/users.service';
import { BookingService } from '@/booking/booking.service';
import { UtilityType } from './enums/utility-type.enum';
import { Role } from '@/auth/enums/role.enum';

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
   * @param {Repository<UtilitySale>} utilitySaleRepository - Repository cho thực thể UtilitySale.
   * @param {UsersService} usersService - Service để truy vấn thông tin người dùng.
   * @param {BookingService} bookingService - Service để truy vấn thông tin đặt sân.
   */
  constructor(
    @InjectRepository(Utility)
    private readonly utilityRepository: Repository<Utility>,
    @InjectRepository(UtilitySale)
    private readonly utilitySaleRepository: Repository<UtilitySale>,
    private readonly usersService: UsersService,
    private readonly bookingService: BookingService,
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

  /**
   * @method recordSale
   * @description Ghi nhận một giao dịch bán sản phẩm.
   * @param {RecordSaleDto} dto - DTO chứa ID sản phẩm, số lượng và ID đơn đặt sân (tùy chọn).
   * @param {AuthenticatedUser} user - Người dùng (nhân viên) đang thực hiện giao dịch.
   * @returns {Promise<UtilitySale>} - Giao dịch bán hàng vừa được tạo.
   * @throws {ForbiddenException} Nếu nhân viên không thuộc chi nhánh nào.
   * @throws {NotFoundException} Nếu sản phẩm hoặc đơn đặt sân không tồn tại.
   * @throws {BadRequestException} Nếu tiện ích không phải là một sản phẩm có giá.
   */
  async recordSale(
    dto: RecordSaleDto,
    user: AuthenticatedUser,
  ): Promise<UtilitySale> {
    const { utilityId, quantity, bookingId } = dto;

    const staffProfile = await this.usersService.findProfileByAccountId(
      user.id,
      ['branch'],
    );
    if (!staffProfile || !staffProfile.branch) {
      throw new ForbiddenException(
        'Tài khoản của bạn không được gán cho chi nhánh nào.',
      );
    }

    const utility = await this.utilityRepository.findOneBy({ id: utilityId });
    if (!utility) {
      throw new NotFoundException('Sản phẩm không tồn tại.');
    }
    if (utility.type !== UtilityType.PRODUCT || !utility.price) {
      throw new BadRequestException('Tiện ích này không phải là sản phẩm bán.');
    }

    let booking = null;
    if (bookingId) {
      booking = await this.bookingService.findOne(bookingId);
      if (!booking) {
        throw new NotFoundException('Đơn đặt sân không tồn tại.');
      }
    }

    const unitPrice = utility.price;
    const totalPrice = unitPrice * quantity;

    const newSale = this.utilitySaleRepository.create({
      utility,
      branch: staffProfile.branch,
      booking: booking || undefined,
      quantity,
      unitPrice,
      totalPrice,
      soldBy: staffProfile,
    });

    return this.utilitySaleRepository.save(newSale);
  }

  /**
   * @method getStats
   * @description Lấy dữ liệu thống kê doanh thu bán sản phẩm.
   * @param {AuthenticatedUser} user - Người dùng đang yêu cầu thống kê (để phân quyền).
   * @param {string} [startDate] - Ngày bắt đầu lọc.
   * @param {string} [endDate] - Ngày kết thúc lọc.
   * @returns {Promise<object>} - Dữ liệu thống kê bao gồm tổng doanh thu, tổng sản phẩm đã bán và top sản phẩm bán chạy.
   * @throws {ForbiddenException} Nếu Manager/Staff không thuộc chi nhánh nào.
   */
  async getStats(
    user: AuthenticatedUser,
    startDate?: string,
    endDate?: string,
  ) {
    // Admin có thể xem tất cả chi nhánh, Manager/Staff chỉ xem được chi nhánh của mình
    const targetBranchId =
      user.role === Role.Admin ? undefined : user.branch_id;

    if (user.role !== Role.Admin && !targetBranchId) {
      throw new ForbiddenException(
        'Tài khoản của bạn không thuộc chi nhánh nào để xem thống kê.',
      );
    }

    const query = this.utilitySaleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalPrice)', 'totalRevenue')
      .addSelect('SUM(sale.quantity)', 'totalItemsSold');

    if (startDate && endDate) {
      query.where('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Lọc theo chi nhánh nếu người dùng không phải Admin
    if (targetBranchId) {
      query.andWhere('sale.branch_id = :branchId', {
        branchId: targetBranchId,
      });
    }

    const result = await query.getRawOne();

    const topSelling = await this.utilitySaleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.utility', 'utility')
      .select('utility.name', 'name')
      .addSelect('SUM(sale.quantity)', 'totalQuantity')
      .addSelect('SUM(sale.totalPrice)', 'totalRevenue')
      .where(
        startDate && endDate
          ? 'sale.createdAt BETWEEN :startDate AND :endDate'
          : '1=1',
        { startDate, endDate },
      )
      .andWhere(targetBranchId ? 'sale.branch_id = :branchId' : '1=1', {
        branchId: targetBranchId,
      })
      .groupBy('utility.name')
      .orderBy('totalQuantity', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      totalItemsSold: parseInt(result.totalItemsSold) || 0,
      topSellingProducts: topSelling.map((p) => ({
        ...p,
        totalQuantity: parseInt(p.totalQuantity),
        totalRevenue: parseFloat(p.totalRevenue),
      })),
    };
  }
}
