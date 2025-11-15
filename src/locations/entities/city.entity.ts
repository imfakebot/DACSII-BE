import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Ward } from './ward.entity';
import { Address } from '../../locations/entities/address.entity';

@Entity({ name: 'cities' })
export class City {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  type!: string;

  /**
   * Một Thành phố (City) có nhiều Phường/Xã (Ward).
   * Quan hệ: One-to-Many.
   * ERD: C ||--o{ W
   */
  @OneToMany(() => Ward, (ward: Ward) => ward.city) // Đã thêm kiểu tường minh cho 'ward' và loại bỏ 'as City'
  wards!: Ward[]; // Đã thêm toán tử khẳng định gán xác định

  /**
   * Một Thành phố (City) có nhiều Địa chỉ (Address).
   * Quan hệ: One-to-Many.
   * ERD: Mối quan hệ này được suy ra từ việc Addresses có cityId.
   */
  @OneToMany(() => Address, (address: Address) => address.city) // Đã thêm kiểu tường minh cho 'address'
  addresses!: Address[]; // Đã thêm toán tử khẳng định gán xác định
}
