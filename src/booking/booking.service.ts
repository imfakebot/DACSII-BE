import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
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
 * @description Dịch vụ xử lý logic nghiệp vụ liên quan đến việc đặt sân,
 * bao gồm tạo, hủy, truy vấn và quản lý các đơn đặt sân.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
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
   * @method createBooking
   * @description (User) Tạo một đơn đặt sân mới.
   * Quá trình này được thực hiện trong một giao dịch CSDL để đảm bảo tính toàn vẹn, bao gồm:
   * - Kiểm tra và khóa (lock) các dòng dữ liệu để chống race condition.
   * - Xác thực tính khả dụng của sân và tính giá.
   * - Xác thực và áp dụng voucher (nếu có).
   * - Tạo bản ghi `Booking` và `Payment` ở trạng thái `PENDING`.
   * - Trả về URL thanh toán VNPAY.
   * @param {CreateBookingDto} createBookingDto - DTO chứa thông tin chi tiết để tạo đơn đặt sân.
   * @param {UserProfile} userProfile - Hồ sơ của người dùng đang thực hiện việc đặt sân.
   * @returns {Promise<object>} Một đối tượng chứa thông tin đơn đặt sân, URL thanh toán, số tiền cuối cùng và thông báo.
   * @throws {ConflictException} Nếu sân đã được đặt trong khung giờ được yêu cầu.
   * @throws {NotFoundException} Nếu mã giảm giá không tồn tại.
   * @throws {BadRequestException} Nếu mã giảm giá không hợp lệ hoặc không đáp ứng điều kiện.
   */
  async createBooking(
    createBookingDto: CreateBookingDto,
    userProfile: UserProfile,
    ip: string
  ) {
    this.logger.log(
      `Creating booking for user ${userProfile.id} with DTO: ${JSON.stringify(
        createBookingDto,
      )}`,
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const start = new Date(createBookingDto.startTime);
      const end = new Date(
        start.getTime() + createBookingDto.durationMinutes * 60000,
      );

      const overlappingBooking = await queryRunner.manager.findOne(Booking, {
        where: {
          field: { id: createBookingDto.fieldId },
          status: Not(BookingStatus.CANCELLED),
          start_time: LessThan(end),
          end_time: MoreThan(start),
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (overlappingBooking) {
        this.logger.warn(
          `Overlapping booking found for field ${createBookingDto.fieldId} at time ${createBookingDto.startTime}`,
        );
        throw new ConflictException(
          'Sân đã bị người khác đặt trong khung giờ này (hoặc đang thanh toán)!',
        );
      }

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

      if (createBookingDto.voucherCode) {
        this.logger.log(
          `Applying voucher ${createBookingDto.voucherCode} for booking`,
        );
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: createBookingDto.voucherCode },
          lock: { mode: 'pessimistic_write' },
        });

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
            `Đơn hàng phải tối thiểu ${Number(
              voucher.minOrderValue,
            ).toLocaleString()}đ`,
          );
        }

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

        await queryRunner.manager.decrement(
          Voucher,
          { id: voucher.id },
          'quantity',
          1,
        );
      }

      const newBooking = queryRunner.manager.create(Booking, {
        start_time: start,
        end_time: end,
        total_price: originalPrice,
        status: BookingStatus.PENDING,
        code: this.generateBookingCode(),
        bookingDate: new Date(),
        userProfile: userProfile,
        field: { id: createBookingDto.fieldId } as Field,
        customerName: userProfile.full_name,
        customerPhone: userProfile.phone_number,
      });

      const savedBooking = await queryRunner.manager.save(Booking, newBooking);

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

      await queryRunner.commitTransaction();

      this.logger.log(
        `Booking ${savedBooking.id} created successfully for user ${userProfile.id}`,
      );

      const paymentUrl = this.paymentService.createVnPayUrl(
        finalPrice,
        savedBooking.id,
        ip,
      );

      return {
        booking: savedBooking,
        paymentUrl: paymentUrl,
        finalAmount: finalPrice,
        message: 'Đặt sân thành công, vui lòng thanh toán.',
      };
    } catch (error) {
      this.logger.error(
        `Error creating booking for user ${userProfile.id}:`,
        error,
      );
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @method cancelBooking
   * @description Hủy một đơn đặt sân.
   * Chỉ chủ sở hữu đơn hoặc Admin/Manager mới có thể hủy. Không thể hủy nếu quá sát giờ đá.
   * Nếu có áp dụng voucher, số lượng voucher sẽ được hoàn lại.
   * @param {string} bookingId - ID của đơn đặt sân cần hủy.
   * @param {string} accountId - ID của tài khoản người dùng đang thực hiện hành động.
   * @param {Role} userRole - Vai trò của người dùng.
   * @returns {Promise<object>} - Một đối tượng chứa thông báo xác nhận hủy thành công.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân.
   * @throws {ForbiddenException} Nếu người dùng không có quyền hủy đơn này.
   * @throws {BadRequestException} Nếu đơn đặt sân không thể hủy (đã hủy, quá giờ,...).
   */
  async cancelBooking(bookingId: string, accountId: string, userRole: Role) {
    this.logger.log(
      `Attempting to cancel booking ${bookingId} by user ${accountId} with role ${userRole}`,
    );
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['userProfile', 'userProfile.account'],
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found for cancellation`);
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }

    const bookingAccountId =
      booking.userProfile && booking.userProfile.account
        ? booking.userProfile.account.id
        : undefined;

    if (bookingAccountId !== accountId && userRole !== Role.Admin) {
      this.logger.error(
        `User ${accountId} does not have permission to cancel booking ${bookingId}`,
      );
      throw new ForbiddenException('Bạn không có quyền hủy đơn này.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      this.logger.warn(`Booking ${bookingId} is already cancelled`);
      throw new BadRequestException('Đơn đặt sân đã được hủy trước đó.');
    }

    const timeDiff = booking.start_time.getTime() - new Date().getTime();
    if (timeDiff < 60 * 60 * 1000) {
      this.logger.warn(
        `Booking ${bookingId} cannot be cancelled due to time limit`,
      );
      throw new BadRequestException('Chỉ có thể hủy trước giờ đá 60 phút.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      booking.status = BookingStatus.CANCELLED;
      await queryRunner.manager.save(Booking, booking);
      this.logger.log(`Booking ${bookingId} status updated to CANCELLED`);

      const payment = await queryRunner.manager.findOne(Payment, {
        where: { booking: { id: booking.id } },
        relations: ['voucher'],
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await queryRunner.manager.save(Payment, payment);
        this.logger.log(
          `Payment for booking ${bookingId} status updated to FAILED`,
        );

        if (payment.voucher) {
          await queryRunner.manager.increment(
            Voucher,
            { id: payment.voucher.id },
            'quantity',
            1,
          );
          this.logger.log(`Voucher for booking ${bookingId} has been refunded`);
        }

        await queryRunner.commitTransaction();
        this.logger.log(`Booking ${bookingId} cancelled successfully`);
        return {
          message:
            'Hủy đơn đặt sân thành công. Mã giảm giá (nếu có) đã được hoàn lại.',
        };
      }
    } catch (error) {
      this.logger.error(`Error cancelling booking ${bookingId}:`, error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @method findOne
   * @description Tìm một đơn đặt sân bằng ID, kèm theo thông tin người dùng và sân.
   * @param {string} id - ID của đơn đặt sân.
   * @returns {Promise<Booking | null>} - Thực thể Booking hoặc null nếu không tìm thấy.
   */
  async findOne(id: string) {
    this.logger.log(`Finding booking with id ${id}`);
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['userProfile', 'userProfile.account', 'field'],
    });
    
    if (booking) {
      this.logger.log(`[DEBUG findOne] Booking ${id} found with status: "${booking.status}" (type: ${typeof booking.status}, raw value: ${JSON.stringify(booking.status)})`);
    }
    
    return booking;
  }

  /**
   * @method updateStatus
   * @description Cập nhật trạng thái của một đơn đặt sân.
   * Thường được gọi bởi các service khác (ví dụ: `PaymentService` sau khi xử lý IPN).
   * @param {string} bookingId - ID của đơn đặt sân cần cập nhật.
   * @param {BookingStatus} status - Trạng thái mới.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân.
   */
  async updateStatus(bookingId: string, status: BookingStatus) {
    this.logger.log(`Updating booking ${bookingId} to status ${status}`);
    
    // Use query builder to ensure status is updated
    const result = await this.bookingRepository
      .createQueryBuilder()
      .update(Booking)
      .set({ status: status })
      .where('id = :id', { id: bookingId })
      .execute();
    
    if (result.affected === 0) {
      this.logger.error(`Booking with ID: ${bookingId} not found`);
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }
    
    this.logger.log(`Booking ${bookingId} status updated to ${status}`);
  }

  /**
   * @method getUserBooking
   * @description Lấy danh sách các đơn đặt sân của một người dùng cụ thể, có phân trang và lọc.
   * @param {string} accountId - ID tài khoản của người dùng.
   * @param {FilterBookingDto} filter - DTO chứa các tiêu chí lọc và phân trang.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách đơn đặt sân và thông tin phân trang.
   */
  async getUserBooking(accountId: string, filter: FilterBookingDto) {
    this.logger.log(
      `Getting user bookings for account ${accountId} with filter: ${JSON.stringify(
        filter,
      )}`,
    );
    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.field', 'field')
      .leftJoinAndSelect('field.images', 'images')
      .leftJoin('booking.userProfile', 'userProfile')
      .leftJoin('userProfile.account', 'account')
      .where('account.id = :accountId', { accountId })
      .orderBy('booking.createdAt', 'DESC')
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
   * @method getAllBookings
   * @description Lấy tất cả các đơn đặt sân cho mục đích quản lý.
   * - Admin: Xem tất cả.
   * - Manager/Staff: Chỉ xem các booking thuộc chi nhánh của mình.
   * @param {FilterBookingDto} filter - DTO chứa các tiêu chí lọc và phân trang.
   * @param {AuthenticatedUser} user - Người dùng đang thực hiện yêu cầu.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách đơn đặt sân và thông tin phân trang.
   */
  async getAllBookings(filter: FilterBookingDto, user: AuthenticatedUser) {
    this.logger.log(
      `Getting all bookings for user ${user.id
      } with filter: ${JSON.stringify(filter)}`,
    );
    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.field', 'field')
      .leftJoinAndSelect('field.branch', 'branch')
      .leftJoinAndSelect('field.images', 'images')
      .leftJoin('booking.userProfile', 'userProfile')
      .leftJoin('userProfile.account', 'account')
      .orderBy('booking.createdAt', 'DESC')
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
   * @deprecated Should use `getAllBookings` instead for better role-based filtering.
   */
  async findAll(page: number, limit: number, status?: BookingStatus) {
    this.logger.log(
      `Finding all bookings with page: ${page}, limit: ${limit}, status: ${status}`,
    );
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

  /**
   * @method createBookingByAdmin
   * @description (Admin/Staff/Manager) Tạo đơn đặt sân trực tiếp tại quầy.
   * Đơn được tạo với phương thức thanh toán là `CASH` và trạng thái `COMPLETED`.
   * @param {AdminCreateBookingDto} dto - DTO chứa thông tin đơn đặt sân.
   * @param {AuthenticatedUser} user - Người dùng (nhân viên) đang tạo đơn.
   * @returns {Promise<Booking>} - Đơn đặt sân vừa được tạo.
   * @throws {ForbiddenException} Nếu nhân viên cố gắng tạo đơn cho chi nhánh khác.
   */
  async createBookingByAdmin(
    dto: AdminCreateBookingDto,
    user: AuthenticatedUser,
  ) {
    this.logger.log(
      `User ${user.id} creating booking by admin with DTO: ${JSON.stringify(
        dto,
      )}`,
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const field = await this.fieldRepository.findOne({
        where: { id: dto.fieldId },
        relations: ['branch'],
      });
      if (!field) {
        throw new NotFoundException('Sân không tồn tại.');
      }

      if (user.branch_id && field.branch.id !== user.branch_id) {
        throw new ForbiddenException(
          'Bạn không thể tạo đơn cho sân thuộc chi nhánh khác.',
        );
      }
      const pricingResult = await this.pricingService.checkPriceAndAvailability(
        {
          fieldId: dto.fieldId,
          startTime: dto.startTime,
          durationMinutes: dto.durationMinutes,
        },
      );

      let userProfile: UserProfile | null = null;
      if (dto.customerPhone) {
        userProfile = await this.userService.findProfileByPhoneNumber(
          dto.customerPhone,
        );
      }

      const start = new Date(dto.startTime);
      const end = new Date(start.getTime() + dto.durationMinutes * 60000);

      const newBooking = queryRunner.manager.create(Booking, {
        start_time: start,
        end_time: end,
        total_price: pricingResult.pricing.total_price,
        status: BookingStatus.COMPLETED,
        bookingDate: new Date(),
        field: { id: dto.fieldId } as Field,
        userProfile: userProfile || undefined,
        customerName:
          dto.customerName ||
          (userProfile ? userProfile.full_name : 'Khách vãng lai'),
        customerPhone: dto.customerPhone,
      });
      const savedBooking = await queryRunner.manager.save(Booking, newBooking);

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
      this.logger.log(
        `Booking ${savedBooking.id} created successfully by admin ${user.id}`,
      );
      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @method checkInCustomer
   * @description (Manager/Admin) Check-in cho khách hàng tại sân.
   * Cập nhật trạng thái đơn đặt sân từ `COMPLETED` thành `CHECKED_IN`.
   * @param {string} bookingId - ID của đơn đặt sân cần check-in.
   * @returns {Promise<Booking>} - Thông tin đơn đặt sân đã được cập nhật.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân.
   * @throws {BadRequestException} Nếu đơn không ở trạng thái `COMPLETED` hoặc đã được check-in.
   */
  async checkInCustomer(identifier: string): Promise<Booking> {
    this.logger.log(`Checking in customer for booking with identifier ${identifier}`);
    const booking = await this.bookingRepository.findOne({
      where: [
        { id: identifier }, // Searches by UUID
        { code: identifier }, // Searches by code
      ],
    });

    if (!booking) {
      this.logger.warn(`Booking with identifier ${identifier} not found for check-in`);
      throw new NotFoundException(
        `Không tìm thấy đơn đặt sân với mã: ${identifier}`,
      );
    }

    if (booking.status === BookingStatus.CHECKED_IN) {
      this.logger.warn(`Booking ${booking.id} is already checked in`);
      throw new BadRequestException(
        'Đơn đặt sân này đã được check-in trước đó.',
      );
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      this.logger.warn(
        `Booking ${booking.id} is not in COMPLETED state for check-in`,
      );
      throw new BadRequestException(
        `Không thể check-in cho đơn ở trạng thái "${booking.status}". Đơn phải được thanh toán thành công.`,
      );
    }

    booking.status = BookingStatus.CHECKED_IN;
    booking.check_in_at = new Date();
    this.logger.log(`[DEBUG] About to save booking ${booking.id} with status: ${booking.status}`);
    
    // Update using query builder to ensure status is saved
    await this.bookingRepository
      .createQueryBuilder()
      .update(Booking)
      .set({ 
        status: BookingStatus.CHECKED_IN,
        check_in_at: new Date()
      })
      .where('id = :id', { id: booking.id })
      .execute();
    
    this.logger.log(`[DEBUG] Booking ${booking.id} updated via query builder`);
    
    // Reload booking to get fresh data
    const savedBooking = await this.bookingRepository.findOne({
      where: { id: booking.id }
    });
    
    if (savedBooking) {
      this.logger.log(`[DEBUG] Booking ${savedBooking.id} reloaded. Status after save: "${savedBooking.status}"`);
    }
    
    this.logger.log(`Booking ${booking.id} checked in successfully`);
    
    return savedBooking || booking;
  }

  /**
   * @method getFieldSchedule
   * @description Lấy lịch các khung giờ đã được đặt của một sân trong một ngày cụ thể.
   * @param {string} fieldId - ID của sân.
   * @param {string} date - Ngày cần xem lịch (format: YYYY-MM-DD).
   * @returns {Promise<object>} - Danh sách các khung giờ đã đặt trong ngày.
   */
  async getFieldSchedule(fieldId: string, date: string) {
    this.logger.log(`Getting schedule for field ${fieldId} on date ${date}`);

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const bookings = await this.bookingRepository.find({
      where: {
        field: { id: fieldId },
        status: Not(BookingStatus.CANCELLED),
        start_time: LessThan(endOfDay),
        end_time: MoreThan(startOfDay),
      },
      select: ['id', 'start_time', 'end_time', 'status'],
      order: { start_time: 'ASC' },
    });

    return {
      date,
      fieldId,
      bookings: bookings.map((b) => ({
        startTime: b.start_time.toISOString(),
        endTime: b.end_time.toISOString(),
        status: b.status,
      })),
    };
  }

  /**
   * @private
   * @method generateBookingCode
   * @description Tạo mã đặt sân duy nhất theo định dạng YYMMDD-XXXX.
   * @returns {string} - Mã đặt sân.
   */
  private generateBookingCode(): string {
    const now = new Date();
    const datePrefix = moment(now).format('YYMMDD');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${datePrefix}-${suffix}`;
  }
}
