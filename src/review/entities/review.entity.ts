import { Booking } from '@/booking/entities/booking.entity';
import { Field } from '@/field/entities/field.entity';
import { UserProfile } from '@/user/entities/users-profile.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

/**
 * @class Review
 * @description Đại diện cho bảng `reviews` trong cơ sở dữ liệu.
 * Lưu trữ thông tin đánh giá của người dùng cho một lượt đặt sân.
 */
@Entity({ name: 'reviews' })
export class Review {
  /**
   * ID duy nhất của bài đánh giá.
   * Thường được liên kết với ID của lượt đặt sân (Booking).
   */
  @Column({ type: 'varchar', length: 36, primary: true })
  id!: string;

  /**
   * Điểm đánh giá của người dùng, thường theo thang điểm từ 1 đến 5.
   */
  @Column({ type: 'int' })
  rating!: number;

  /**
   * Nội dung bình luận chi tiết của người dùng về lượt đặt sân.
   * Có thể để trống.
   */
  @Column({ type: 'text', nullable: true })
  comment!: string;

  /**
   * Dấu thời gian khi bài đánh giá được tạo.
   * Được tự động gán bởi TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Mối quan hệ một-một với thực thể Booking.
   * Mỗi bài đánh giá chỉ thuộc về một lượt đặt sân duy nhất.
   * `onDelete: 'CASCADE'` đảm bảo rằng nếu một lượt đặt sân bị xóa,
   * bài đánh giá liên quan cũng sẽ tự động bị xóa.
   */
  @OneToOne(() => Booking, (booking) => booking.review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => Field, (field) => field.reviews)
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_profile_id' })
  userProfile!: UserProfile;
}
