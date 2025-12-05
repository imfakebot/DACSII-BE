import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Field } from '../field/entities/field.entity';
import { PricingService } from '@/pricing/pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { Payment } from '@/payment/entities/payment.entity';
import { PaymentService } from '@/payment/payment.service';
import { PaymentMethod } from '@/payment/enums/payment-method.enum';
import { PaymentStatus } from '@/payment/enums/payment-status.enum';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { AdminCreateBookingDto } from './dto/admin-create-booking';
import { UsersService } from '@/user/users.service';
import { Role } from '@/auth/enums/role.enum';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';
import moment from 'moment';

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
    private readonly userService: UsersService,
  ) { }

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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --- 1. TÍNH TOÁN THỜI GIAN ---
      const start = new Date(createBookingDto.startTime);
      const end = new Date(
        start.getTime() + createBookingDto.durationMinutes * 60000,
      );

      // --- 2. [FIX RACE CONDITION 1] KIỂM TRA SÂN & KHÓA DÒNG DỮ LIỆU ---
      // Thay vì tin tưởng pricingService, ta tự kiểm tra lại trong Transaction với khóa 'pessimistic_write'

      // Tìm xem có đơn nào đang trùng giờ không
      const overlappingBooking = await queryRunner.manager.findOne(Booking, {
        where: {
          field: { id: createBookingDto.fieldId },
          status: Not(BookingStatus.CANCELLED), // Chỉ tính các đơn chưa hủy
          // Logic trùng giờ: (StartA < EndB) && (EndA > StartB)
          start_time: LessThan(end),
          end_time: MoreThan(start),
        },
        lock: { mode: 'pessimistic_write' }, // 👈 QUAN TRỌNG: Khóa lại ngay khi đọc!
      });

      if (overlappingBooking) {
        throw new ConflictException(
          'Sân đã bị người khác đặt trong khung giờ này (hoặc đang thanh toán)!',
        );
      }

      // --- 3. GỌI SERVICE TÍNH GIÁ ---
      // Lúc này sân đã an toàn, ta gọi service để lấy giá tiền chuẩn
      const pricingResult = await this.pricingService.checkPriceAndAvailability(
        {
          fieldId: createBookingDto.fieldId,
          startTime: createBookingDto.startTime,
          durationMinutes: createBookingDto.durationMinutes,
        },
      );

      const originalPrice = pricingResult.pricing.total_price;
      let finalPrice = originalPrice;
      let appliedVoucher: Voucher | null = null;

      // --- 4. [FIX RACE CONDITION 2] XỬ LÝ VOUCHER ---
      if (createBookingDto.voucherCode) {
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: createBookingDto.voucherCode },
          lock: { mode: 'pessimistic_write' }, //  QUAN TRỌNG: Khóa Voucher để tránh 2 người cùng dùng cái cuối cùng
        });

        // Validate Voucher
        if (!voucher) throw new NotFoundException('Mã giảm giá không tồn tại');
        if (voucher.quantity <= 0)
          throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');

        const now = new Date();
        if (now > voucher.validTo)
          throw new BadRequestException('Mã giảm giá đã hết hạn');
        if (now < voucher.validFrom)
          throw new BadRequestException('Mã giảm giá chưa đến đợt áp dụng');
        if (originalPrice < Number(voucher.minOrderValue)) {
          throw new BadRequestException(
            `Đơn hàng phải tối thiểu ${Number(voucher.minOrderValue).toLocaleString()}đ`,
          );
        }

        // Tính toán giảm giá
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

        finalPrice = Math.max(0, originalPrice - discountAmount);
        appliedVoucher = voucher;

        // Trừ số lượng (Vì đã lock nên đoạn này an toàn tuyệt đối)
        await queryRunner.manager.decrement(
          Voucher,
          { id: voucher.id },
          'quantity',
          1,
        );
      }

      // --- 5. LƯU BOOKING & PAYMENT ---
      const newBooking = queryRunner.manager.create(Booking, {
        start_time: start,
        end_time: end,
        total_price: originalPrice, // Giá gốc
        status: BookingStatus.PENDING,
        code: this.generateBookingCode(), // <--- Tự động sinh mã
        bookingDate: new Date(),
        userProfile: userProfile,
        field: { id: createBookingDto.fieldId } as Field,
      });

      const savedBooking = await queryRunner.manager.save(Booking, newBooking);

      const newPayment = queryRunner.manager.create(Payment, {
        amount: originalPrice,
        finalAmount: finalPrice, // Giá sau giảm
        paymentMethod: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        booking: savedBooking,
        voucher: appliedVoucher || undefined,
        createdAt: new Date(),
      });

      await queryRunner.manager.save(Payment, newPayment);

      // --- 6. COMMIT ---
      await queryRunner.commitTransaction();

      // Tạo URL thanh toán (Làm ngoài transaction cho nhanh cũng được, hoặc trong cũng ok)
      const paymentUrl = this.paymentService.createVnPayUrl(
        finalPrice,
        savedBooking.id,
        '127.0.0.1', // Nên lấy IP thật từ request nếu có thể
      );

      return {
        booking: savedBooking,
        paymentUrl: paymentUrl,
        finalAmount: finalPrice,
        message: 'Đặt sân thành công, vui lòng thanh toán.',
      };
    } catch (error) {
      // Rollback nếu có bất kỳ lỗi nào (kể cả lỗi Conflict ở bước 2)
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng kết nối
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
  async getAllBookings(filter: FilterBookingDto, user: AuthenticatedUser) {
    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.field', 'field') // Lấy thông tin sân
      .leftJoinAndSelect('field.branch', 'branch')
      .leftJoinAndSelect('field.images', 'images') // Lấy ảnh sân (nếu cần)
      .leftJoin('booking.userProfile', 'userProfile')
      .leftJoin('userProfile.account', 'account')
      .orderBy('booking.createdAt', 'DESC') // Mới nhất lên đầu
      .skip(skip)
      .take(limit);

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    if (user.branch_id) {
      query.andWhere('branch.id = :branchId', { branchId: user.branch_id });
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
   * @method findAll
   * @description Lấy danh sách tất cả các đơn đặt sân với phân trang và tùy chọn lọc theo trạng thái.
   * @param {number} page - Số trang hiện tại.
   * @param {number} limit - Số lượng kết quả trên mỗi trang.
   * @param {BookingStatus} [status] - (Tùy chọn) Lọc các đơn đặt sân theo một trạng thái cụ thể.
   * @returns {Promise<{ data: Booking[]; total: number; page: number; lastPage: number; }>} - Một đối tượng chứa danh sách các đơn đặt sân, tổng số lượng, trang hiện tại và trang cuối cùng.
   */
  async findAll(page: number, limit: number, status?: BookingStatus) {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.userProfile', 'user')
      .leftJoinAndSelect('booking.field', 'field')
      .orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere('booking.status=:status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async createBookingByAdmin(
    dto: AdminCreateBookingDto,
    user: AuthenticatedUser,
  ) {
    // Dùng Transaction để an toàn dữ liệu
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Kiểm tra Sân thuộc chi nhánh nào
      const field = await this.fieldRepository.findOne({
        where: { id: dto.fieldId },
        relations: ['branch'],
      });
      if (!field) {
        throw new NotFoundException('Sân không tồn tại.');
      }

      // 2. LOGIC BẢO MẬT: Kiểm tra quyền của nhân viên
      if (user.branch_id && field.branch.id !== user.branch_id) {
        throw new ForbiddenException(
          'Bạn không thể tạo đơn cho sân thuộc chi nhánh khác.',
        );
      }
      // 3.check giá và sân
      const pricingResult = await this.pricingService.checkPriceAndAvailability(
        {
          fieldId: dto.fieldId,
          startTime: dto.startTime,
          durationMinutes: dto.durationMinutes,
        },
      );

      // 4. Tìm User
      let userProfile: UserProfile | null = null;
      if (dto.customerPhone) {
        userProfile = await this.userService.findProfileByPhoneNumber(
          dto.customerPhone,
        );
      }

      const start = new Date(dto.startTime);
      const end = new Date(start.getTime() + dto.durationMinutes * 60000);

      // 5. Tạo Booking (Dùng queryRunner.manager)
      const newBooking = queryRunner.manager.create(Booking, {
        start_time: start,
        end_time: end,
        total_price: pricingResult.pricing.total_price,
        status: BookingStatus.COMPLETED, // Admin chốt đơn
        bookingDate: new Date(),
        field: { id: dto.fieldId } as Field,
        userProfile: userProfile || undefined,
        customerName:
          dto.customerName ||
          (userProfile ? userProfile.full_name : 'Khách vãng lai'),
        customerPhone: dto.customerPhone,
      });
      const savedBooking = await queryRunner.manager.save(Booking, newBooking);

      // 6. Tạo Payment (CASH - Completed)
      const newPayment = queryRunner.manager.create(Payment, {
        amount: pricingResult.pricing.total_price,
        finalAmount: pricingResult.pricing.total_price,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        booking: savedBooking,
        createdAt: new Date(),
        completedAt: new Date(),
      });
      await queryRunner.manager.save(Payment, newPayment);

      await queryRunner.commitTransaction();
      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xử lý check-in cho khách hàng tại sân.
   * @param bookingId ID của đơn đặt sân cần check-in.
   * @returns Thông tin đơn đặt sân đã được cập nhật.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân.
   * @throws {BadRequestException} Nếu đơn đặt sân không ở trạng thái 'COMPLETED' hoặc đã được check-in.
   */
  async checkInCustomer(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt sân với mã: ${bookingId}`);
    }

    if (booking.status === BookingStatus.CHECKED_IN) {
      throw new BadRequestException('Đơn đặt sân này đã được check-in trước đó.');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(`Không thể check-in cho đơn ở trạng thái "${booking.status}". Đơn phải được thanh toán thành công.`);
    }

    booking.status = BookingStatus.CHECKED_IN;
    booking.check_in_at = new Date();
    return this.bookingRepository.save(booking);
  }

  private generateBookingCode(): string {
    const now = new Date();
    const datePrefix = moment(now).format('YYMMDD'); // Cần import moment hoặc tự format

    // Sinh 4 ký tự ngẫu nhiên
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${datePrefix}-${suffix}`; // VD: 251206-AH92
  }
}
