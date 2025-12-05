import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { Repository } from 'typeorm';
import { CreateVoucherDto } from './dto/create-voucher.dto';

/**
 * @class VoucherService
 * @description Service quản lý các logic liên quan đến mã giảm giá (voucher).
 * Bao gồm tạo mới, kiểm tra tính hợp lệ và tính toán giá trị giảm giá.
 */
@Injectable()
export class VoucherService {
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
    const exists = await this.voucherRepository.findOne({
      where: { code: dto.code },
    });
    if (exists) {
      throw new BadRequestException('Voucher đã tồn tại');
    }

    const voucher = this.voucherRepository.create(dto);
    return this.voucherRepository.save(voucher);
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
    const voucher = await this.voucherRepository.findOne({ where: { code } });

    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại');
    }

    const now = new Date();
    if (now < new Date(voucher.validFrom)) {
      throw new BadRequestException('Mã giảm giá chưa đến đợt áp dụng');
    }
    if (now > new Date(voucher.validTo)) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (voucher.quantity <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết');
    }

    if (orderValue < Number(voucher.minOrderValue)) {
      throw new BadRequestException(
        `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString()}đ để áp dụng`,
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

    return {
      isValid: true,
      code: voucher.code,
      discountAmount: Math.floor(discountAmount),
      finalAmount: orderValue - Math.floor(discountAmount),
      message: 'Áp dụng mã giảm giá thành công',
    };
  }

  async remove(id: string) {
    // Kiểm tra tồn tại
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại.');
    }

    // Soft delete (TypeORM tự động set deletedAt = now())
    await this.voucherRepository.softDelete(id);

    return { message: 'Xóa voucher thành công.' };
  }
}
