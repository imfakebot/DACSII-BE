import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserProfile } from '../../user/entities/users-profile.entity';
import { Field } from '../../field/entities/field.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Review } from '../../review/entities/review.entity';
import { BookingStatus } from '../enums/booking-status.enum';

@Entity({ name: 'bookings' })
export class Booking {
  /**
   * ID tự động sinh ra dạng UUID.
   * Đổi từ @Column primary sang @PrimaryGeneratedColumn để tiện lợi hơn.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_date', type: 'date' })
  bookingDate!: Date;

  /**
   * THÊM MỚI: Thời gian bắt đầu thực tế (Ví dụ: 17:30:00)
   * Cần thiết cho mô hình Giờ Động.
   */
  @Column({ name: 'start_time', type: 'datetime' })
  start_time!: Date;

  /**
   * THÊM MỚI: Thời gian kết thúc thực tế (Ví dụ: 19:00:00)
   * Cần thiết cho mô hình Giờ Động.
   */
  @Column({ name: 'end_time', type: 'datetime' })
  end_time!: Date;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  total_price!: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  // --- Các mối quan hệ ---

  @ManyToOne(
    () => UserProfile,
    (userProfile) => userProfile.bookings as unknown as Booking,
  )
  @JoinColumn({ name: 'user_profile_id' })
  userProfile!: UserProfile;

  @ManyToOne(() => Field, (field) => field.bookings as unknown as Booking)
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @OneToOne(() => Payment, (payment) => payment.booking as unknown as Booking)
  payment!: Payment;

  @OneToOne(() => Review, (review) => review.booking as unknown as Booking)
  review!: Review;

  // --- Dấu thời gian ---

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
