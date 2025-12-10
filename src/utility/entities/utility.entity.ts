import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Field } from '../../field/entities/field.entity';
import { ApiProperty } from '@nestjs/swagger';
import { UtilityType } from '../enums/utility-type.enum';

/**
 * @entity Utility
 * @description Đại diện cho một tiện ích (amenity) hoặc sản phẩm (product) mà sân bóng có thể cung cấp.
 * Ví dụ: Wi-Fi, bãi đỗ xe, nước uống, đồ ăn nhẹ.
 */
@Entity({ name: 'utilities' })
export class Utility {
  /**
   * ID duy nhất của tiện ích, dạng số tự tăng.
   */
  @ApiProperty({ description: 'ID duy nhất của tiện ích', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Tên của tiện ích hoặc sản phẩm. Phải là duy nhất.
   * @example "Nước tăng lực Sting"
   */
  @ApiProperty({ description: 'Tên của tiện ích', example: 'Wi-Fi miễn phí' })
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  /**
   * URL đến icon đại diện cho tiện ích. Có thể để trống.
   */
  @ApiProperty({
    description: 'URL đến icon đại diện cho tiện ích',
    required: false,
    example: 'https://example.com/icons/wifi.png',
  })
  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl!: string;

  /**
   * Giá bán của sản phẩm.
   * Sẽ là `null` nếu đây là một tiện nghi miễn phí (type = 'amenity').
   */
  @ApiProperty({
    description: 'Giá của tiện ích (nếu có thể bán)',
    required: false,
    example: 20000,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number;

  /**
   * Phân loại tiện ích là 'amenity' (tiện nghi có sẵn) hoặc 'product' (sản phẩm để bán).
   */
  @ApiProperty({
    description: 'Loại tiện ích: là tiện nghi hay sản phẩm bán',
    enum: UtilityType,
    default: UtilityType.AMENITY,
  })
  @Column({ type: 'enum', enum: UtilityType, default: UtilityType.AMENITY })
  type!: UtilityType;

  /**
   * Mối quan hệ Nhiều-Nhiều với Field.
   * Dùng để thể hiện các **tiện nghi** có sẵn tại một sân bóng.
   */
  @ManyToMany(() => Field, (field) => field.utilities)
  fields!: Field[];
}
