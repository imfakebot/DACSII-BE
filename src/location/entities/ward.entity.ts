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
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class Ward
 * @description Đại diện cho một Phường/Xã trong hệ thống.
 */
@Entity({ name: 'wards' })
export class Ward {
  @ApiProperty({ description: 'ID duy nhất của Phường/Xã', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @ApiProperty({ description: 'Loại đơn vị hành chính', example: 'Phường' })
  @Column({ type: 'varchar', length: 255 })
  type!: string;

  @ApiProperty({ description: 'Tên Phường/Xã', example: 'Linh Chiểu' })
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  // --- MỐI QUAN HỆ ---

  /**
   * Một Phường/Xã (Ward) thuộc về một Thành phố (City).
   */
  @ApiProperty({ type: () => City })
  @ManyToOne(() => City, (city) => city.wards)
  @JoinColumn({ name: 'city_id' })
  city?: City;

  /**
   * Một Phường/Xã (Ward) có nhiều Địa chỉ (Address).
   */
  @OneToMany(() => Address, (address) => address.ward)
  addresses?: Address[];
}
