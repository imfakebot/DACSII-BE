import { Payment } from '@/payments/entities/payment.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity({ name: 'vouchers' })
export class Voucher {
  @Column({ type: 'varchar', length: 36, primary: true })
  id!: string;

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

  @OneToMany(() => Payment, (payment) => payment.voucher)
  payments!: Payment[];
}
