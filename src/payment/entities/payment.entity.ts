import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Booking } from '@/booking/entities/booking.entity';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class Payment
 * @description Đại diện cho một giao dịch thanh toán trong hệ thống.
 */
@Entity({ name: 'payments' })
export class Payment {
  @ApiProperty({ description: 'ID duy nhất của giao dịch', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ApiProperty({ description: 'Số tiền gốc của đơn hàng', example: 200000 })
  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @ApiProperty({
    description: 'Số tiền cuối cùng sau khi áp dụng giảm giá',
    example: 180000,
  })
  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2 })
  finalAmount!: number;

  @ApiProperty({
    description: 'Trạng thái của giao dịch',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    enum: PaymentMethod,
    example: PaymentMethod.VNPAY,
  })
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    description: 'Mã giao dịch từ cổng thanh toán',
    required: false,
  })
  @Column({
    name: 'transaction_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionCode!: string;

  @ApiProperty({
    description: 'Thời điểm giao dịch hoàn thành',
    required: false,
  })
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ description: 'Thời điểm tạo giao dịch' })
  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Mã ngân hàng (nếu có)', required: false })
  @Column({ name: 'bank_code', nullable: true })
  bankCode!: string;

  @OneToOne(() => Booking, (booking) => booking.payment)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ApiProperty({ type: () => Voucher, required: false })
  @ManyToOne(() => Voucher, { nullable: true }) // Cho phép không có voucher
  @JoinColumn({ name: 'voucher_id' })
  voucher!: Voucher;
}
