import { BookingService } from '@/booking/booking.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';

/**
 * @class ReviewService
 * @description Service xử lý logic nghiệp vụ liên quan đến đánh giá của người dùng.
 */
@Injectable()
export class ReviewService {
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
    const { bookingId, rating, comment } = createReviewDto;

    // 1. Tìm Booking, đảm bảo join đủ các quan hệ cần thiết (field, userProfile)
    const booking = await this.bookingService.findOne(bookingId); // findOne đã có relations: ['userProfile', 'field']
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân.');
    }

    // 2. Kiểm tra quyền sở hữu (User này có phải người đặt không?)
    if (booking.userProfile.id !== userProfile.id) {
      throw new BadRequestException('Bạn không có quyền đánh giá đơn này.');
    }

    // 3. Kiểm tra trạng thái đơn (Phải đá xong mới được review)
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá các đơn đặt sân đã hoàn thành.',
      );
    }

    // 4. Kiểm tra đã review chưa (Tránh spam)
    const existingReview = await this.reviewRepository.findOne({
      where: { booking: { id: bookingId } },
    });
    if (existingReview) {
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

    return this.reviewRepository.save(newReview);
  }

  /**
   * Tìm tất cả các bài đánh giá của một sân bóng cụ thể, có phân trang.
   * @param {string} fieldId - ID của sân bóng cần lấy đánh giá.
   * @param {number} [page=1] - Trang hiện tại.
   * @param {number} [limit=10] - Số lượng đánh giá trên mỗi trang.
   * @returns {Promise<object>} - Một đối tượng chứa danh sách đánh giá và thông tin meta (tổng số, trang, điểm trung bình...).
   */
  async findByField(fieldId: string, page: number = 1, limit: number = 10) {
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
   * Xóa một bài đánh giá dựa trên ID.
   * @param {string} id - ID của bài đánh giá cần xóa.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa thành công.
   * @throws {NotFoundException} Nếu không tìm thấy bài đánh giá.
   */
  async delete(id: string) {
    const result = await this.reviewRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    return { message: 'Xóa đánh giá thành công.' };
  }
}
