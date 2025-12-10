import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Ward } from './ward.entity';
import { Address } from '../../location/entities/address.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class City
 * @description Đại diện cho một Tỉnh/Thành phố trong hệ thống.
 */
@Entity({ name: 'cities' })
export class City {
  @ApiProperty({ description: 'ID duy nhất của Tỉnh/Thành phố', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @ApiProperty({
    description: 'Tên Tỉnh/Thành phố',
    example: 'Thành phố Hồ Chí Minh',
  })
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @ApiProperty({
    description: 'Loại đơn vị hành chính',
    example: 'Thành phố Trung ương',
  })
  @Column({ type: 'varchar', length: 255 })
  type!: string;

  /**
   * Một Thành phố (City) có nhiều Phường/Xã (Ward).
   */
  @OneToMany(() => Ward, (ward: Ward) => ward.city)
  wards!: Ward[];

  /**
   * Một Thành phố (City) có nhiều Địa chỉ (Address).
   */
  @OneToMany(() => Address, (address: Address) => address.city)
  addresses!: Address[];
}
