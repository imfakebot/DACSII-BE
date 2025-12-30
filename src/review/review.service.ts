import { BookingService } from '@/booking/booking.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { AuthenticatedUser } from '@/auth/interface/authenicated-user.interface';
import { Role } from '@/auth/enums/role.enum';

/**
 * @class ReviewService
 * @description Service xử lý logic nghiệp vụ liên quan đến đánh giá của người dùng.
 */
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  /**
   * @constructor
   * @param {Repository<Review>} reviewRepository - Repository để tương tác với thực thể Review.
   * @param {BookingService} bookingService - Service để truy vấn thông tin về các lượt đặt sân.
   */
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    private readonly bookingService: BookingService,
  ) {}

  /**
   * Tạo một bài đánh giá mới cho một lượt đặt sân.
   * @param {CreateReviewDto} createReviewDto - DTO chứa thông tin đánh giá (ID đơn đặt, điểm, bình luận).
   * @param {UserProfile} userProfile - Hồ sơ của người dùng đang thực hiện đánh giá.
   * @returns {Promise<Review>} - Bài đánh giá vừa được tạo.
   * @throws {NotFoundException} Nếu không tìm thấy đơn đặt sân.
   * @throws {BadRequestException} Nếu người dùng không có quyền, đơn chưa hoàn thành, hoặc đã được đánh giá trước đó.
   */
  async createReview(
    createReviewDto: CreateReviewDto,
    userProfile: UserProfile,
  ) {
    this.logger.log(`User ${userProfile.id} creating review for booking ${createReviewDto.bookingId}`);
    const { bookingId, rating, comment } = createReviewDto;

    // 1. Tìm Booking, đảm bảo join đủ các quan hệ cần thiết (field, userProfile)
    const booking = await this.bookingService.findOne(bookingId); // findOne đã có relations: ['userProfile', 'field']
    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found.`);
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }

    this.logger.log(`[DEBUG] Found booking ${bookingId} with status: "${booking.status}" (type: ${typeof booking.status})`);

    // 2. Kiểm tra quyền sở hữu (User này có phải người đặt không?)
    if (booking.userProfile.id !== userProfile.id) {
      this.logger.warn(`User ${userProfile.id} unauthorized to review booking ${bookingId}.`);
      throw new BadRequestException('Bạn không có quyền đánh giá đơn này.');
    }

    // 3. Kiểm tra trạng thái đơn (Phải đã check-in hoặc hoàn thành mới được review)
    // Xử lý trường hợp status rỗng do bug database
    let actualStatus = booking.status;
    
    // Nếu status rỗng nhưng có check_in_at, suy luận status là CHECKED_IN
    if ((!actualStatus || (actualStatus as any) === '') && booking.check_in_at) {
      actualStatus = BookingStatus.CHECKED_IN;
      this.logger.log(`[DEBUG] Status empty but has check_in_at, inferring status as CHECKED_IN`);
    }
    
    const allowedStatuses = [
      BookingStatus.COMPLETED,
      BookingStatus.CHECKED_IN,
      BookingStatus.FINISHED
    ];
    
    // Log để debug
    this.logger.log(`[DEBUG] Booking ${bookingId} actual status: "${actualStatus}" (type: ${typeof actualStatus})`);
    this.logger.log(`[DEBUG] Allowed statuses: ${JSON.stringify(allowedStatuses)}`);
    this.logger.log(`[DEBUG] Status comparison: COMPLETED=${actualStatus === BookingStatus.COMPLETED}, CHECKED_IN=${actualStatus === BookingStatus.CHECKED_IN}, FINISHED=${actualStatus === BookingStatus.FINISHED}`);
    
    // So sánh với actualStatus thay vì booking.status
    const isAllowed = allowedStatuses.includes(actualStatus as BookingStatus);
    
    if (!isAllowed) {
      this.logger.warn(`Booking ${bookingId} status ${actualStatus} not allowed for review.`);
      throw new BadRequestException(
        'Chỉ có thể đánh giá các đơn đặt sân đã check-in hoặc hoàn thành.',
      );
    }

    // 4. Kiểm tra đã review chưa (Tránh spam)
    const existingReview = await this.reviewRepository.findOne({
      where: { booking: { id: bookingId } },
    });
    if (existingReview) {
      this.logger.warn(`Booking ${bookingId} already has a review.`);
      throw new BadRequestException('Bạn đã đánh giá đơn này trước đó.');
    }

    //5. Lưu review
    const newReview = this.reviewRepository.create({
      id: booking.id, // Dùng luôn ID của booking cho review để đảm bảo 1-1
      rating,
      comment,
      booking: booking,
      field: booking.field, // Lấy field từ booking
      userProfile: userProfile, // Lấy userProfile từ người đang review
    });

    const savedReview = this.reviewRepository.save(newReview);
    this.logger.log(`Review ${newReview.id} created successfully for booking ${bookingId}.`);
    return savedReview;
  }

  /**
   * Tìm tất cả các bài đánh giá của một sân bóng cụ thể, có phân trang.
   * @param {string} fieldId - ID của sân bóng cần lấy đánh giá.
   * @param {number} [page=1] - Trang hiện tại.
   * @param {number} [limit=10] - Số lượng đánh giá trên mỗi trang.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách đánh giá và thông tin meta (tổng số, trang, điểm trung bình...).
   */
  async findByField(fieldId: string, page: number = 1, limit: number = 10) {
    this.logger.log(`Fetching reviews for field ${fieldId}, page ${page}, limit ${limit}.`);
    const skip = (page - 1) * limit;

    const [review, total] = await this.reviewRepository.findAndCount({
      where: {
        field: {
          id: fieldId,
        },
      },
      relations: ['userProfile'], // Load thông tin người đánh giá (để hiện tên, avatar)
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Tính điểm trung bình (Optional - để hiển thị rating chung của sân)
    const averageRating =
      total > 0 ? review.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    this.logger.log(`Found ${total} reviews for field ${fieldId}, average rating: ${averageRating}.`);
    return {
      data: review.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          full_name: review.userProfile.full_name,
          avatar_url: review.userProfile.avatar_url,
        },
      })),
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
        averageRating: parseFloat(averageRating.toFixed(1)),
      },
    };
  }

  /**
   * @method findAllReviews
   * @description Lấy danh sách review dùng cho trang quản lý.
   * - Admin: Lấy hết.
   * - Manager: Chỉ lấy review thuộc chi nhánh mình quản lý.
   */
  async findAllReviews(page: number, limit: number, user: AuthenticatedUser) {
    this.logger.log(`User ${user.id} fetching all reviews (management), page ${page}, limit ${limit}. Role: ${user.role}.`);
    const skip = (page - 1) * limit;

    const query = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.userProfile', 'userProfile') // Người review
      .leftJoinAndSelect('review.field', 'field') // Sân được review
      .leftJoinAndSelect('field.branch', 'branch') // Chi nhánh của sân
      .orderBy('review.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // LOGIC PHÂN QUYỀN:
    // Nếu là Manager, thêm điều kiện lọc theo branch_id
    if (user.role === Role.Manager && user.branch_id) {
      this.logger.debug(`Filtering reviews for manager ${user.id} by branch ${user.branch_id}.`);
      query.andWhere('branch.id = :branchId', { branchId: user.branch_id });
    }

    const [data, total] = await query.getManyAndCount();
    this.logger.log(`Found ${total} reviews for management view.`);
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
   * @method delete
   * @description Xóa review. Kiểm tra quyền hạn kỹ càng.
   */
  async delete(id: string, user: AuthenticatedUser) {
    this.logger.log(`User ${user.id} attempting to delete review ${id}. Role: ${user.role}.`);
    // 1. Tìm review kèm thông tin chi nhánh
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: [
        'field',
        'field.branch',
        'userProfile',
        'userProfile.account',
      ],
    });

    if (!review) {
      this.logger.warn(`Review ${id} not found for deletion.`);
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    // 2. Logic kiểm tra quyền
    if (user.role === Role.Admin) {
      this.logger.debug(`Admin ${user.id} deleting review ${id}.`);
      // Admin được quyền xóa tất cả -> Pass
    } else if (user.role === Role.Manager) {
      // Manager chỉ được xóa review của chi nhánh mình
      if (review.field.branch.id !== user.branch_id) {
        this.logger.warn(`Manager ${user.id} unauthorized to delete review ${id} (different branch).`);
        throw new ForbiddenException(
          'Bạn không có quyền xóa đánh giá của chi nhánh khác.',
        );
      }
      this.logger.debug(`Manager ${user.id} deleting review ${id} in own branch.`);
    } else {
      // User thường chỉ được xóa review của chính mình
      // (user.sub hoặc user.id tùy vào JWT payload bạn cấu hình, thường là user.id khớp với account id)
      if (review.userProfile.account.id !== user.id) {
        this.logger.warn(`User ${user.id} unauthorized to delete review ${id} (not owner).`);
        throw new ForbiddenException('Bạn không có quyền xóa đánh giá này.');
      }
      this.logger.debug(`User ${user.id} deleting own review ${id}.`);
    }

    // 3. Xóa
    await this.reviewRepository.delete(id);
    this.logger.log(`Review ${id} deleted successfully.`);
    return { message: 'Xóa đánh giá thành công.' };
  }
}
