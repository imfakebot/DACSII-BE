import { Branch } from '@/branch/entities/branch.entity';
import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Utility } from './utility.entity';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Booking } from '@/booking/entities/booking.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @entity UtilitySale
 * @description Đại diện cho một giao dịch bán một sản phẩm (utility) tại một chi nhánh.
 */
@Entity('utility_sales')
export class UtilitySale {
  /**
   * ID duy nhất của giao dịch, dạng UUID.
   */
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Sản phẩm đã được bán.
   */
  @ManyToOne(() => Utility, (utility) => utility.sales)
  @JoinColumn({ name: 'utility_id' })
  utility!: Utility;

  /**
   * Chi nhánh nơi sản phẩm được bán.
   */
  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  /**
   * Đơn đặt sân liên quan (nếu có). Giao dịch có thể không gắn với đơn nào.
   */
  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' }) // Sale can happen without a booking
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  /**
   * Số lượng sản phẩm đã bán trong giao dịch này.
   */
  @ApiProperty()
  @Column()
  quantity!: number;

  /**
   * Đơn giá của sản phẩm tại thời điểm bán.
   */
  @ApiProperty()
  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  /**
   * Tổng giá trị của giao dịch (đơn giá * số lượng).
   */
  @ApiProperty()
  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  /**
   * Nhân viên đã thực hiện giao dịch bán hàng.
   */
  @ManyToOne(() => UserProfile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sold_by_id' })
  soldBy!: UserProfile;

  /**
   * Thời điểm giao dịch được tạo.
   */
  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
