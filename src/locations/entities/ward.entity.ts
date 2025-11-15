import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { City } from './city.entity';
import { Address } from './address.entity';

@Entity({ name: 'wards' })
export class Ward {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  type!: string;

  // --- MỐI QUAN HỆ ---

  /**
   * Một Phường/Xã (Ward) thuộc về một Thành phố (City).
   * Quan hệ: Many-to-One (Nhiều phường xã thuộc cùng một thành phố).
   * ERD: Cities ||--o{ Wards
   */
  @ManyToOne(() => City, (city) => city.wards)
  @JoinColumn({ name: 'cityId' })
  city!: City;

  @Column({ type: 'int' })
  cityId!: number;

  /**
   * Một Phường/Xã (Ward) có nhiều Địa chỉ (Address).
   * Quan hệ: One-to-Many (Một phường xã có nhiều địa chỉ).
   * ERD: W ||--o{ ADDR
   */
  @OneToMany(() => Address, (address) => address.ward)
  addresses!: Address[];
}
