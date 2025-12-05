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
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'bookings' })
export class Booking {
  /**
   * ID tự động sinh ra dạng UUID.
   * Đổi từ @Column primary sang @PrimaryGeneratedColumn để tiện lợi hơn.
   */
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    description: 'Mã đặt sân duy nhất',
    example: '251206-X8A2',
  })
  @Column({ unique: true })
  code!: string; // Dùng cho nhập tay (Người đọc) - VD: 251206-X8A2

  @ApiProperty({
    description: 'Thời gian check-in thực tế tại sân',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  check_in_at!: Date;

  @ApiProperty({ description: 'Ngày diễn ra trận đấu' })
  @Column({ name: 'booking_date', type: 'date' })
  bookingDate!: Date;

  /**
   * THÊM MỚI: Thời gian bắt đầu thực tế (Ví dụ: 17:30:00)
   * Cần thiết cho mô hình Giờ Động.
   */
  @ApiProperty({ description: 'Thời gian bắt đầu' })
  @Column({ name: 'start_time', type: 'datetime' })
  start_time!: Date;

  /**
   * THÊM MỚI: Thời gian kết thúc thực tế (Ví dụ: 19:00:00)
   * Cần thiết cho mô hình Giờ Động.
   */
  @ApiProperty({ description: 'Thời gian kết thúc' })
  @Column({ name: 'end_time', type: 'datetime' })
  end_time!: Date;

  @ApiProperty({ description: 'Giá gốc của đơn đặt sân', example: 300000 })
  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  total_price!: number;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PENDING })
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  @ApiProperty({
    description: 'Tên khách hàng (cho khách vãng lai)',
    example: 'Anh Bảy',
    required: false,
  })
  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  customerName?: string;

  @ApiProperty({
    description: 'SĐT khách hàng (cho khách vãng lai)',
    example: '0909123456',
    required: false,
  })
  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  customerPhone?: string;

  // --- Các mối quan hệ ---

  @ApiProperty({ type: () => UserProfile, required: false })
  @ManyToOne(
    () => UserProfile,
    (userProfile) => userProfile.bookings as unknown as Booking,
    { nullable: true },
  )
  @JoinColumn({ name: 'user_profile_id' })
  userProfile!: UserProfile;

  @ApiProperty({ type: () => Field })
  @ManyToOne(() => Field, (field) => field.bookings as unknown as Booking)
  @JoinColumn({ name: 'field_id' })
  field!: Field;

  @ApiProperty({ type: () => Payment })
  @OneToOne(() => Payment, (payment) => payment.booking as unknown as Booking)
  payment!: Payment;

  @ApiProperty({ type: () => Review, required: false })
  @OneToOne(() => Review, (review) => review.booking as unknown as Booking)
  review!: Review;

  // --- Dấu thời gian ---

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
