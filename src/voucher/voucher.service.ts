import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { CreateVoucherDto } from './dto/create-voucher.dto';

/**
 * @class VoucherService
 * @description Service quản lý các logic liên quan đến mã giảm giá (voucher).
 * Bao gồm tạo mới, kiểm tra tính hợp lệ và tính toán giá trị giảm giá.
 */
@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  /**
   * (Admin) Tạo một mã giảm giá mới.
   * Kiểm tra xem mã đã tồn tại chưa trước khi tạo.
   * @param {CreateVoucherDto} dto - Dữ liệu để tạo voucher mới.
   * @returns {Promise<Voucher>} Voucher vừa được tạo.
   * @throws {BadRequestException} Nếu mã voucher đã tồn tại.
   */
  async create(dto: CreateVoucherDto) {
    this.logger.log(`Creating new voucher with DTO: ${JSON.stringify(dto)}`);
    const exists = await this.voucherRepository.findOne({
      where: { code: dto.code },
    });
    if (exists) {
      this.logger.warn(`Voucher with code ${dto.code} already exists.`);
      throw new BadRequestException('Voucher đã tồn tại');
    }

    const voucher = this.voucherRepository.create(dto);
    const savedVoucher = await this.voucherRepository.save(voucher);
    this.logger.log(`Voucher ${savedVoucher.code} created successfully.`);
    return savedVoucher;
  }

  /**
   * (Public) Lấy danh sách các voucher hợp lệ cho một giá trị đơn hàng cụ thể.
   * @param orderValue Giá trị của đơn hàng để kiểm tra điều kiện minOrderValue.
   * @returns Danh sách các voucher có thể áp dụng.
   */
  async findAvailableVouchers(orderValue: number): Promise<Voucher[]> {
    this.logger.log(`Finding available vouchers for order value: ${orderValue}`);
    const now = new Date();
    const availableVouchers = await this.voucherRepository.find({
      where: {
        quantity: MoreThan(0),
        validFrom: LessThanOrEqual(now),
        validTo: MoreThan(now),
        minOrderValue: LessThanOrEqual(orderValue),
      },
      order: {
        // Ưu tiên sắp xếp, ví dụ: voucher giảm nhiều tiền hơn lên trước
        discountAmount: 'DESC',
        discountPercentage: 'DESC',
      },
    });
    this.logger.log(`Found ${availableVouchers.length} available vouchers.`);
    return availableVouchers;
  }

  /**
   * (User) Kiểm tra tính hợp lệ của một mã giảm giá và tính toán số tiền được giảm.
   * Thực hiện các kiểm tra sau:
   * - Tồn tại
   * - Còn hạn sử dụng
   * - Còn số lượng
   * - Đạt giá trị đơn hàng tối thiểu
   * @param {string} code - Mã voucher cần kiểm tra.
   * @param {number} orderValue - Giá trị của đơn hàng để kiểm tra điều kiện.
   * @returns {Promise<object>} Một object chứa kết quả kiểm tra và số tiền được giảm.
   * @throws {NotFoundException} Nếu voucher không tồn tại.
   * @throws {BadRequestException} Nếu voucher không hợp lệ (hết hạn, hết lượt, không đủ điều kiện,...).
   */
  async checkVoucher(code: string, orderValue: number) {
    this.logger.log(`Checking voucher code "${code}" for order value: ${orderValue}`);
    const voucher = await this.voucherRepository.findOne({ where: { code } });

    if (!voucher) {
      this.logger.warn(`Voucher "${code}" not found.`);
      throw new NotFoundException('Voucher không tồn tại');
    }

    const now = new Date();
    if (now < new Date(voucher.validFrom)) {
      this.logger.warn(`Voucher "${code}" not yet valid.`);
      throw new BadRequestException('Mã giảm giá chưa đến đợt áp dụng');
    }
    if (now > new Date(voucher.validTo)) {
      this.logger.warn(`Voucher "${code}" expired.`);
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (voucher.quantity <= 0) {
      this.logger.warn(`Voucher "${code}" out of stock.`);
      throw new BadRequestException('Mã giảm giá đã hết');
    }

    if (orderValue < Number(voucher.minOrderValue)) {
      this.logger.warn(`Voucher "${code}" minimum order value not met. Required: ${voucher.minOrderValue}, actual: ${orderValue}`);
      throw new BadRequestException(
        `Đơn hàng phải tối thiểu ${Number(
          voucher.minOrderValue,
        ).toLocaleString()}đ để áp dụng`,
      );
    }

    let discountAmount = 0;

    if (voucher.discountAmount) {
      // Loại 1: Giảm tiền mặt (VD: 50k)
      discountAmount = Number(voucher.discountAmount);
    } else if (voucher.discountPercentage) {
      // Loại 2: Giảm % (VD: 10%)
      discountAmount = orderValue * (voucher.discountPercentage / 100);
      if (
        voucher.maxDiscountAmount &&
        discountAmount > Number(voucher.maxDiscountAmount)
      ) {
        // Kiểm tra trần giảm giá (Max cap)
        discountAmount = Number(voucher.maxDiscountAmount);
      }
    }

    if (discountAmount > orderValue) {
      discountAmount = orderValue;
    }
    this.logger.log(`Voucher "${code}" applied, discount amount: ${discountAmount}.`);
    return {
      isValid: true,
      code: voucher.code,
      discountAmount: Math.floor(discountAmount),
      finalAmount: orderValue - Math.floor(discountAmount),
      message: 'Áp dụng mã giảm giá thành công',
    };
  }

  async remove(id: string) {
    this.logger.log(`Deleting voucher with ID: ${id}`);
    // Kiểm tra tồn tại
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) {
      this.logger.warn(`Voucher with ID ${id} not found for deletion.`);
      throw new NotFoundException('Voucher không tồn tại.');
    }

    // Soft delete (TypeORM tự động set deletedAt = now())
    await this.voucherRepository.softDelete(id);
    this.logger.log(`Voucher ${id} soft deleted successfully.`);
    return { message: 'Xóa voucher thành công.' };
  }
}
