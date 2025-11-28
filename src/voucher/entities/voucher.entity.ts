import { Payment } from '@/payment/entities/payment.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'vouchers' })
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountAmount!: number | null;

  @Column({ name: 'discount_percentage', type: 'int', nullable: true })
  discountPercentage!: number | null;

  @Column({
    name: 'max_discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  maxDiscountAmount!: number | null;

  @Column({
    name: 'min_order_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  minOrderValue!: number;

  @Column({ name: 'valid_from', type: 'datetime' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'datetime' })
  validTo!: Date;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Payment, (payment) => payment.voucher)
  payments!: Payment[];
}
