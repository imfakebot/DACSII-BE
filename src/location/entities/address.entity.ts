import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { City } from './city.entity';
import { Ward } from './ward.entity';
import { Branch } from '../../branch/entities/branch.entity'; // Import Branch thay vì Field

@Entity({ name: 'addresses' })
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  street!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number;

  /**
   * Một Địa chỉ thuộc về một Thành phố (City).
   */
  @ManyToOne(() => City, (city) => city.addresses)
  @JoinColumn({ name: 'city_id' }) // TypeORM thường dùng snake_case cho cột trong DB
  city!: City;

  /**
   * Một Địa chỉ thuộc về một Phường/Xã (Ward).
   */
  @ManyToOne(() => Ward, (ward) => ward.addresses)
  @JoinColumn({ name: 'ward_id' })
  ward!: Ward;

  /**
   * THAY ĐỔI QUAN TRỌNG:
   * Một Địa chỉ gắn liền với một Chi nhánh (Branch).
   * Quan hệ: One-to-One (Một chi nhánh có một địa chỉ duy nhất).
   * Lưu ý: Bên Branch sẽ giữ @JoinColumn.
   */
  @OneToOne(() => Branch, (branch) => branch.address)
  branch!: Branch;
}
