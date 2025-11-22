import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { City } from './city.entity';
import { Ward } from './ward.entity';
import { Field } from '../../fields/entities/field.entity';

@Entity({ name: 'addresses' })
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  street!: string;

  /**
   * Một Địa chỉ (Address) thuộc về một Thành phố (City).
   * Quan hệ: Many-to-One (Nhiều địa chỉ có thể thuộc cùng một thành phố).
   * ERD: Wards --o{ Addresses và Cities --o{ Wards.
   * Để truy vấn dễ dàng hơn, ERD của bạn đã thêm cityId trực tiếp vào Addresses.
   */
  @ManyToOne(() => City, (city) => city.addresses)
  @JoinColumn({ name: 'cityId' })
  city!: City;

  /**
   * Một Địa chỉ (Address) thuộc về một Phường/Xã (Ward).
   * Quan hệ: Many-to-One (Nhiều địa chỉ có thể thuộc cùng một phường/xã).
   * ERD: Wards --o{ Addresses
   */
  @ManyToOne(() => Ward, (ward) => ward.addresses, { nullable: true })
  @JoinColumn({ name: 'ward_id' })
  ward?: Ward | null;

  /**
   * Một Địa chỉ (Address) có thể có nhiều Sân bóng (Field).
   * Quan hệ: One-to-Many (Một địa chỉ có thể là vị trí của nhiều sân).
   * ERD: ADDR ||--o{ F : "is located at"
   */
  @OneToMany(() => Field, (field) => field.address)
  fields!: Field[];
}
