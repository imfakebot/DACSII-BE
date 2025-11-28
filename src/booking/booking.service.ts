import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Field } from '../field/entities/field.entity';
import { PricingService } from '@/pricing/pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { Role } from '@/auth/enums/role.enum';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { Payment } from '@/payment/entities/payment.entity';
import { PaymentService } from '@/payment/payment.service';
import { PaymentMethod } from '@/payment/enums/payment-method.enum';
import { PaymentStatus } from '@/payment/enums/payment-status.enum';
import { FilterBookingDto } from './dto/filter-booking.dto';

/**
 * @class BookingService
 * @description Dịch vụ xử lý logic liên quan đến việc đặt sân, bao gồm tạo, hủy và truy vấn thông tin đặt sân.
 */
@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    private readonly pricingService: PricingService,
    private readonly paymentService: PaymentService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo một đơn đặt sân mới.
   * Quá trình này bao gồm kiểm tra giá và tính khả dụng, xác thực voucher, tạo bản ghi đặt sân và thanh toán trong một giao dịch cơ sở dữ liệu.
   * @param createBookingDto DTO chứa thông tin chi tiết để tạo một đơn đặt sân.
   * @param userProfile Hồ sơ của người dùng đang thực hiện việc đặt sân.
   * @returns Một đối tượng chứa thông tin đơn đặt sân đã lưu, URL thanh toán, số tiền cuối cùng và một thông báo.
   * @throws {ConflictException} Nếu sân đã được đặt trong khung giờ được yêu cầu.
   * @throws {NotFoundException} Nếu mã giảm giá không tồn tại.
   * @throws {BadRequestException} Nếu mã giảm giá không hợp lệ hoặc không đáp ứng điều kiện.
   */
  async createBooking(
    createBookingDto: CreateBookingDto,
    userProfile: UserProfile,
  ) {
    // Transaction: Bắt đầu phiên làm việc
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. TÁI SỬ DỤNG LOGIC KIỂM TRA & TÍNH GIÁ
      // Bước này cực quan trọng: Nó đảm bảo giá đúng và sân chưa bị ai cướp
      // Nếu sân đã bị đặt, hàm này sẽ ném lỗi ConflictException ngay lập tức.
      const pricingResult = await this.pricingService.checkPriceAndAvailability(
        {
          fieldId: createBookingDto.fieldId,
          startTime: createBookingDto.startTime,
          durationMinutes: createBookingDto.durationMinutes,
        },
      );

      // 2. Chuẩn bị dữ liệu để lưu
      // pricingResult trả về booking_details dạng chuỗi, cần tính lại Date object để lưu DB
      const start = new Date(createBookingDto.startTime);
      const end = new Date(
        start.getTime() + createBookingDto.durationMinutes * 60000,
      );
      const originalPrice = pricingResult.pricing.total_price;
      let finalPrice = originalPrice;
      let appliedVoucher: Voucher | null = null;

      // Xử lí voucher
      if (createBookingDto.voucherCode) {
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: createBookingDto.voucherCode },
        });

        // Validate voucher
        if (!voucher) {
          throw new NotFoundException('Mã giảm giá không tồn tại');
        }
        if (voucher.quantity <= 0) {
          throw new BadRequestException('Mã giảm giá đã hết');
        }
        if (new Date() > voucher.validTo) {
          throw new BadRequestException('Mã giảm giá đã hết hạn');
        }
        if (new Date() < voucher.validFrom) {
          throw new BadRequestException('Mã giảm giá chưa đến đợt áp dụng');
        }
        if (originalPrice < Number(voucher.minOrderValue)) {
          throw new BadRequestException(
            `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString()}đ để áp dụng`,
          );
        }

        //Tính giảm giá
        let discountAmount = 0;
        if (voucher.discountAmount) {
          discountAmount = Number(voucher.discountAmount);
        } else if (voucher.discountPercentage) {
          discountAmount = originalPrice * (voucher.discountPercentage / 100);
          if (
            voucher.maxDiscountAmount &&
            discountAmount > Number(voucher.maxDiscountAmount)
          ) {
            discountAmount = Number(voucher.maxDiscountAmount);
          }
        }

        finalPrice = originalPrice - discountAmount;
        if (finalPrice < 0) {
          finalPrice = 0;
        }

        appliedVoucher = voucher;

        await queryRunner.manager.decrement(
          Voucher,
          { id: voucher.id },
          'quantity',
          1,
        );
      }

      // 3. Tạo Booking Entity
      const newBooking = queryRunner.manager.create(Booking, {
        start_time: start,
        end_time: end,
        total_price: pricingResult.pricing.total_price, // Lấy giá đã tính từ PricingService
        status: BookingStatus.PENDING, // Mặc định là chờ thanh toán/xác nhận
        bookingDate: new Date(), // Ngày thực hiện đặt đơn
        userProfile: userProfile, // Người đặt
        field: { id: createBookingDto.fieldId } as Field, // Sân bóng
      });
      // 4. Lưu vào CSDL
      const savedBooking = await queryRunner.manager.save(Booking, newBooking);

      // 5. Tạo Payment Record (Pending)

      const newPayment = queryRunner.manager.create(Payment, {
        amount: originalPrice,
        finalAmount: finalPrice,
        paymentMethod: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        booking: savedBooking,
        voucher: appliedVoucher || undefined,
        createdAt: new Date(),
      });

      await queryRunner.manager.save(Payment, newPayment);

      // 6. Commit transaction
      await queryRunner.commitTransaction();

      const paymentUrl = this.paymentService.createVnPayUrl(
        finalPrice,
        savedBooking.id,
        '127.0.0.1',
      );

      return {
        booking: savedBooking,
        paymentUrl: paymentUrl,
        finalAmount: finalPrice,
        message: 'Đặt sân thành công, vui lòng thanh toán.',
      };
    } catch (error) {
      // Nếu có lỗi, rollback toàn bộ (không tạo booking, không trừ voucher)
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Hủy đơn đặt sân.
   * Chỉ chủ sở hữu đơn đặt hoặc quản trị viên mới có thể hủy. Không thể hủy nếu thời gian bắt đầu sắp diễn ra (ít hơn 60 phút).
   * @param bookingId ID của đơn đặt sân cần hủy.
   * @param accountId ID của tài khoản người dùng đang thực hiện hành động (lấy từ token).
   * @param userRole Vai trò của người dùng đang thực hiện hành động.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân.
   * @throws {ForbiddenException} Nếu người dùng không có quyền hủy đơn này.
   * @throws {BadRequestException} Nếu đơn đặt sân đã bị hủy hoặc không thể hủy do thời gian.
   * @returns Một đối tượng chứa thông báo xác nhận hủy thành công.
   */
  async cancelBooking(bookingId: string, accountId: string, userRole: Role) {
    // 1. Tìm booking kèm thông tin người đặt để kiểm tra quyền
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['userProfile', 'userProfile.account'],
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }

    // Safely resolve booking account id with explicit null checks and an explicit cast
    // to avoid unsafe member access on a value that TypeScript/linters may consider error-typed.
    const bookingAccountId =
      booking.userProfile && booking.userProfile.account
        ? booking.userProfile.account.id
        : undefined;

    // 2. Kiểm tra quyền
    // Only allow the owner of the booking or an admin to cancel
    if (bookingAccountId !== accountId && userRole !== Role.Admin) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn này.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn đặt sân đã được hủy trước đó.');
    }

    // 4.  Kiểm tra thời gian: Không cho hủy nếu còn < 60p là đá
    const timeDiff = booking.start_time.getTime() - new Date().getTime();
    if (timeDiff < 60 * 60 * 1000) {
      // 60 phút
      throw new BadRequestException('Chỉ có thể hủy trước giờ đá 60 phút.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 5. Cập nhật trạng thái booking -> Cancelled
      booking.status = BookingStatus.CANCELLED;
      await queryRunner.manager.save(Booking, booking);

      //6. Xử lý payment và voucher
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { booking: { id: booking.id } },
        relations: ['voucher'],
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await queryRunner.manager.save(Payment, payment);

        //7. Hoàn voucher (Nếu có dùng)
        if (payment.voucher) {
          await queryRunner.manager.increment(
            Voucher,
            { id: payment.voucher.id },
            'quantity',
            1,
          );
        }

        await queryRunner.commitTransaction();
        return {
          message:
            'Hủy đơn đặt sân thành công. Mã giảm giá (nếu có) đã được hoàn lại.',
        };
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tìm một đơn đặt sân bằng ID.
   * @param id ID của đơn đặt sân cần tìm.
   * @returns Promise giải quyết về thực thể `Booking` nếu tìm thấy, ngược lại là `null`.
   */
  findOne(id: string) {
    return this.bookingRepository.findOne({
      where: { id },
      relations: ['userProfile', 'userProfile.account', 'field'],
    });
  }

  /**
   * Cập nhật trạng thái của một đơn đặt sân.
   * Phương thức này thường được gọi bởi các dịch vụ khác (ví dụ: PaymentService) để phản ánh kết quả của một hành động, như thanh toán thành công hoặc thất bại.
   * @method updateStatus
   * @param {string} bookingId - ID của đơn đặt sân cần cập nhật.
   * @param {BookingStatus} status - Trạng thái mới sẽ được gán cho đơn đặt sân.
   * @returns {Promise<void>} - Promise được giải quyết khi cập nhật hoàn tất.
   * @throws {NotFoundException} - Ném ra nếu không tìm thấy đơn đặt sân với ID đã cho.
   */
  async updateStatus(bookingId: string, status: BookingStatus) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      console.error(`Không tìm thấy đơn đặt sân với ID: ${bookingId}`);
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }

    booking.status = status;
    await this.bookingRepository.save(booking);
  }

  /**
   * Lấy danh sách các đơn đặt sân của một người dùng cụ thể.
   * @param accountId ID của tài khoản người dùng.
   * @param filter Đối tượng chứa các tiêu chí lọc và phân trang.
   * @returns {Promise<{ data: Booking[]; meta: { total: number; page: number; limit: number; lastPage: number; } }>} Một đối tượng chứa danh sách đơn đặt sân và thông tin phân trang.
   */
  async getUserBooking(accountId: string, filter: FilterBookingDto) {
    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.field', 'field') // Lấy thông tin sân
      .leftJoinAndSelect('field.images', 'images') // Lấy ảnh sân (nếu cần)
      .leftJoin('booking.userProfile', 'userProfile')
      .leftJoin('userProfile.account', 'account')
      .where('account.id = :accountId', { accountId })
      .orderBy('booking.createdAt', 'DESC') // Mới nhất lên đầu
      .skip(skip)
      .take(limit);

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy tất cả các đơn đặt sân (dành cho Admin hoặc các vai trò có quyền).
   * @param filter Đối tượng chứa các tiêu chí lọc và phân trang.
   * @returns {Promise<{ data: Booking[]; meta: { total: number; page: number; limit: number; lastPage: number; } }>} Một đối tượng chứa danh sách đơn đặt sân và thông tin phân trang.
   */
  async getAllBookings(filter: FilterBookingDto) {
    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.field', 'field') // Lấy thông tin sân
      .leftJoinAndSelect('field.images', 'images') // Lấy ảnh sân (nếu cần)
      .leftJoin('booking.userProfile', 'userProfile')
      .leftJoin('userProfile.account', 'account')
      .orderBy('booking.createdAt', 'DESC') // Mới nhất lên đầu
      .skip(skip)
      .take(limit);

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
