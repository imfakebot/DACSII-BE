import { Payment } from '@/payment/entities/payment.entity';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'vouchers' })
export class Voucher {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'SUMMER2024' })
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @ApiProperty({
    description: 'Số tiền giảm giá cố định',
    example: 50000,
    required: false,
  })
  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountAmount!: number | null;

  @ApiProperty({
    description: 'Tỷ lệ giảm giá (%)',
    example: 10,
    required: false,
  })
  @Column({ name: 'discount_percentage', type: 'int', nullable: true })
  discountPercentage!: number | null;

  @ApiProperty({
    description: 'Số tiền giảm giá tối đa',
    example: 100000,
    required: false,
  })
  @Column({
    name: 'max_discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  maxDiscountAmount!: number | null;

  @ApiProperty({ description: 'Giá trị đơn hàng tối thiểu', example: 500000 })
  @Column({
    name: 'min_order_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  minOrderValue!: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực' })
  @Column({ name: 'valid_from', type: 'datetime' })
  validFrom!: Date;

  @ApiProperty({ description: 'Ngày kết thúc hiệu lực' })
  @Column({ name: 'valid_to', type: 'datetime' })
  validTo!: Date;

  @ApiProperty({ description: 'Số lượng voucher', example: 100 })
  @Column({ type: 'int' })
  quantity!: number;

  @ApiProperty({
    description: 'ID của người dùng được cấp voucher (nếu có)',
    required: false,
    format: 'uuid',
  })
  @Column({ name: 'user_profile_id', type: 'varchar', length: 36, nullable: true })
  userProfileId!: string | null;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'user_profile_id' })
  userProfile!: UserProfile | null;

  @ApiProperty({ description: 'Ngày tạo' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Ngày cập nhật cuối' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleteAt!: Date;

  @OneToMany(() => Payment, (payment) => payment.voucher)
  payments!: Payment[];
}
