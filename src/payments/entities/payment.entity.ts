import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Booking } from '@/bookings/entities/booking.entity';
import { Voucher } from '@/vouchers/entities/voucher.entity';

@Entity({ name: 'payments' })
export class Payment {
  @Column({ type: 'varchar', length: 36, primary: true })
  id!: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2 })
  finalAmount!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
  })
  @Column({
    name: 'transaction_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionCode!: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @OneToOne(() => Booking, (booking) => booking.payment)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => Voucher, { nullable: true }) // Cho phép không có voucher
  @JoinColumn({ name: 'voucher_id' })
  voucher!: Voucher;
}
