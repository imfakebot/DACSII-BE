import {  Entity,  PrimaryGeneratedColumn,  Column,  ManyToOne,  JoinColumn,  OneToMany,  OneToOne, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import { City } from './city.entity';
import { Ward } from './ward.entity';
import { Fields } from '../../fields/entities/field.entity';
import { UserProfile } from '../../users/entities/users-profile.entity';

@Entity({ name: 'addresses' })
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  street!: string;

  // --- MỐI QUAN HỆ ---

  /**
   * Một Địa chỉ (Address) thuộc về một Thành phố (City).
   * Quan hệ: Many-to-One (Nhiều địa chỉ có thể thuộc cùng một thành phố).
   * ERD: Wards --o{ Addresses và Cities --o{ Wards.
   * Để truy vấn dễ dàng hơn, ERD của bạn đã thêm cityId trực tiếp vào Addresses.
   */
  @ManyToOne(() => City, (city) => city.addresses)
  @JoinColumn({ name: 'cityId' })
  city!: City;

  @Column({ type: 'int' })
  cityId!: number;

  /**
   * Một Địa chỉ (Address) thuộc về một Phường/Xã (Ward).
   * Quan hệ: Many-to-One (Nhiều địa chỉ có thể thuộc cùng một phường/xã).
   * ERD: Wards --o{ Addresses
   */
  @ManyToOne(() => Ward, (ward) => ward.addresses)
  @JoinColumn({ name: 'wardId' })
  ward!: Ward;

  @Column({ type: 'int' })
  wardId!: number;

  /**
   * Một Địa chỉ (Address) có thể có nhiều Sân bóng (Field).
   * Quan hệ: One-to-Many (Một địa chỉ có thể là vị trí của nhiều sân).
   * ERD: ADDR ||--o{ F : "is located at"
   */
  @OneToMany(() => Fields, (field) => field.address)
  fields!: Fields[];

  /**
   * Một Địa chỉ (Address) là nơi ở của một Hồ sơ người dùng (UserProfile).
   * Quan hệ: One-to-One (Mỗi địa chỉ nhà riêng chỉ gắn với một người dùng).
   * ERD: UP }o--|| ADDR : "resides at"
   */
  @OneToOne(
    () => UserProfile,
    (userProfile) => userProfile.address ,
    { nullable: true, onDelete: 'SET NULL' },
  )
  userProfile!: UserProfile;

  // --- CÁC CỘT MẶC ĐỊNH ---

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
