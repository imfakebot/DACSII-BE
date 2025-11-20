import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    OneToOne,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserProfile } from '../../users/entities/users-profile.entity';
import { Field } from '../../fields/entities/field.entity';
import { TimeSlot } from '../../pricing/entities/time-slot.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Review } from '../../reviews/entities/review.entity';
import { BookingStatus } from '../enums/booking-status.enum';


/**
 * @entity Booking
 * @description Đại diện cho một lượt đặt sân trong hệ thống.
 * Lưu trữ thông tin về người đặt, sân được đặt, thời gian, giá cả và trạng thái.
 */
@Entity({ name: 'bookings' })
export class Booking {
    /**
     * @property {string} id - ID duy nhất của lượt đặt sân (UUID).
     */
    @Column({ type: 'varchar', length: 36, primary: true })
    id!: string;

    /**
     * @property {Date} bookingDate - Ngày diễn ra trận đấu.
     */
    @Column({ name: 'booking_date', type: 'date' })
    bookingDate!: Date;

    /**
     * @property {number} totalPrice - Tổng chi phí cho lượt đặt sân.
     */
    @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
    totalPrice!: number;

    /**
     * @property {BookingStatus} status - Trạng thái hiện tại của lượt đặt sân.
     */
    @Column({
        type: 'enum',
        enum: BookingStatus,
        default: BookingStatus.PENDING,
    })
    status!: BookingStatus;

    // --- Các mối quan hệ ---

    /**
     * @description Mối quan hệ Nhiều-Một với UserProfile.
     * Mỗi lượt đặt sân thuộc về một hồ sơ người dùng.
     */
    @ManyToOne(() => UserProfile, (userProfile) => userProfile.bookings)
    @JoinColumn({ name: 'user_profile_id' })
    userProfile!: UserProfile;

    /**
     * @description Mối quan hệ Nhiều-Một với Field.
     * Mỗi lượt đặt sân thuộc về một sân cụ thể.
     */
    @ManyToOne(() => Field, (field) => field.bookings)
    @JoinColumn({ name: 'field_id' })
    field!: Field;

    /**
     * @description Mối quan hệ Nhiều-Một với TimeSlot.
     * Mỗi lượt đặt sân thuộc về một khung giờ cụ thể.
     */
    @ManyToOne(() => TimeSlot, (timeSlot) => timeSlot.bookings)
    @JoinColumn({ name: 'time_slot_id' })
    timeSlot!: TimeSlot;

    /**
     * @description Mối quan hệ Một-Một với Payment.
     * Mỗi lượt đặt sân có thể có một giao dịch thanh toán liên quan.
     */
    @OneToOne(() => Payment, (payment) => payment.booking)
    payment!: Payment;

    /**
     * @description Mối quan hệ Một-Một với Review.
     * Mỗi lượt đặt sân đã hoàn thành có thể có một bài đánh giá.
     */
    @OneToOne(() => Review, (review) => review.booking)
    review!: Review;

    // --- Dấu thời gian ---

    /**
     * @property {Date} createdAt - Thời điểm lượt đặt sân được tạo.
     * Tự động được gán bởi TypeORM.
     */
    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    /**
     * @property {Date} updatedAt - Thời điểm lượt đặt sân được cập nhật lần cuối.
     * Tự động được gán bởi TypeORM.
     */
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}