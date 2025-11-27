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
import { UserProfile } from '../../users/entities/users-profile.entity';
import { Field } from '../../fields/entities/field.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Review } from '../../reviews/entities/review.entity';
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

  // --- QUAN TRỌNG: XÓA BỎ QUAN HỆ VỚI TIMESLOT ---
  // Vì giờ là động, chúng ta không ràng buộc vào một slot ID cố định nữa.
  /*
  @ManyToOne(() => TimeSlot)
  @JoinColumn({ name: 'time_slot_id' })
  timeSlot!: TimeSlot;
  */

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
