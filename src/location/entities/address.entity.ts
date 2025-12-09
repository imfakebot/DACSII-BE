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
import { Branch } from '../../branch/entities/branch.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class Address
 * @description Đại diện cho một địa chỉ cụ thể trong hệ thống, bao gồm đường, phường, thành phố và tọa độ địa lý.
 */
@Entity({ name: 'addresses' })
export class Address {
  @ApiProperty({ description: 'ID duy nhất của địa chỉ', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Số nhà, tên đường', example: '123 Võ Văn Ngân' })
  @Column({ type: 'varchar', length: 255 })
  street!: string;

  @ApiProperty({ description: 'Vĩ độ', example: 10.853, required: false })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @ApiProperty({ description: 'Kinh độ', example: 106.77, required: false })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  /**
   * Một Địa chỉ thuộc về một Thành phố (City).
   */
  @ApiProperty({ type: () => City })
  @ManyToOne(() => City, (city) => city.addresses)
  @JoinColumn({ name: 'cityId' }) // TypeORM thường dùng snake_case cho cột trong DB
  city!: City;

  /**
   * Một Địa chỉ thuộc về một Phường/Xã (Ward).
   */
  @ApiProperty({ type: () => Ward })
  @ManyToOne(() => Ward, (ward) => ward.addresses)
  @JoinColumn({ name: 'ward_id' })
  ward!: Ward;

  /**
   * Một Địa chỉ gắn liền với một Chi nhánh (Branch).
   */
  @OneToOne(() => Branch, (branch) => branch.address)
  branch!: Branch;
}
