import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Field } from './field.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @entity Utility
 * @description Đại diện cho một tiện ích mà sân bóng có thể cung cấp (ví dụ: Wi-Fi, bãi đỗ xe, nước uống miễn phí).
 */
@Entity({ name: 'utilities' })
export class Utility {
  /**
   * @property {number} id - ID duy nhất của tiện ích (số tự tăng).
   */
  @ApiProperty({ description: 'ID duy nhất của tiện ích', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * @property {string} name - Tên của tiện ích.
   * @description Tên này là duy nhất (unique) trong toàn hệ thống.
   */
  @ApiProperty({ description: 'Tên của tiện ích', example: 'Wi-Fi miễn phí' })
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  /**
   * @property {string} iconUrl - URL đến icon đại diện cho tiện ích.
   * @description Có thể để trống (nullable).
   */
  @ApiProperty({
    description: 'URL đến icon đại diện cho tiện ích',
    required: false,
    example: 'https://example.com/icons/wifi.png',
  })
  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl!: string;

  /**
   * @description Mối quan hệ Nhiều-Nhiều với thực thể Field.
   * Một tiện ích có thể có ở nhiều sân bóng, và một sân bóng có thể có nhiều tiện ích.
   * Mối quan hệ này được quản lý thông qua bảng trung gian `field_utilities` (được định nghĩa trong `Field` entity).
   */
  @ManyToMany(() => Field, (field) => field.utilities)
  fields!: Field[];
}
