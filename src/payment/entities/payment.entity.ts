import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Booking } from '@/booking/entities/booking.entity';
import { Voucher } from '@/voucher/entities/voucher.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class Payment
 * @description Đại diện cho một giao dịch thanh toán trong hệ thống, liên kết với một đơn đặt sân.
 */
@Entity({ name: 'payments' })
export class Payment {
  /**
   * ID duy nhất của giao dịch, định dạng UUID.
   */
  @ApiProperty({ description: 'ID duy nhất của giao dịch', format: 'uuid' })
  @PrimaryColumn()
  id!: string;

  /**
   * Số tiền gốc của đơn hàng (chưa trừ voucher).
   */
  @ApiProperty({ description: 'Số tiền gốc của đơn hàng', example: 200000 })
  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  /**
   * Số tiền cuối cùng khách hàng phải trả (đã trừ voucher).
   */
  @ApiProperty({
    description: 'Số tiền cuối cùng sau khi áp dụng giảm giá',
    example: 180000,
  })
  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2 })
  finalAmount!: number;

  /**
   * Trạng thái của giao dịch (pending, completed, failed).
   */
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

  /**
   * Phương thức thanh toán được sử dụng (cash, vnpay, momo).
   */
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

  /**
   * Mã giao dịch từ cổng thanh toán (nếu có).
   */
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

  /**
   * Thời điểm giao dịch được xác nhận hoàn thành.
   */
  @ApiProperty({
    description: 'Thời điểm giao dịch hoàn thành',
    required: false,
  })
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  /**
   * Thời điểm giao dịch được tạo trong hệ thống.
   */
  @ApiProperty({ description: 'Thời điểm tạo giao dịch' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Mã ngân hàng hoặc ví điện tử được sử dụng để thanh toán (nếu có).
   */
  @ApiProperty({ description: 'Mã ngân hàng (nếu có)', required: false })
  @Column({ name: 'bank_code', nullable: true })
  bankCode!: string;

  /**
   * Mối quan hệ Một-Một với Booking. Mỗi thanh toán thuộc về một đơn đặt sân duy nhất.
   */
  @OneToOne(() => Booking, (booking) => booking.payment)
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  /**
   * Mối quan hệ Nhiều-Một với Voucher. Một thanh toán có thể áp dụng một voucher.
   */
  @ApiProperty({ type: () => Voucher, required: false })
  @ManyToOne(() => Voucher, { nullable: true }) // Cho phép không có voucher
  @JoinColumn({ name: 'voucher_id' })
  voucher!: Voucher;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
