import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Field } from './field.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @entity FieldImage
 * @description Đại diện cho một hình ảnh của sân bóng trong cơ sở dữ liệu.
 * Mỗi sân bóng có thể có nhiều hình ảnh.
 */
@Entity({ name: 'field_images' })
export class FieldImage {
  /**
   * @property {string} id - ID duy nhất của hình ảnh (UUID).
   */
  @ApiProperty({
    description: 'ID duy nhất của hình ảnh',
    format: 'uuid',
  })
  @Column({ type: 'varchar', length: 36, primary: true })
  id!: string;

  /**
   * @property {string} image_url - URL dẫn đến tệp hình ảnh.
   */
  @ApiProperty({
    description: 'URL dẫn đến tệp hình ảnh',
    example: 'https://example.com/images/field1.jpg',
  })
  @Column({ type: 'text' })
  image_url!: string;

  /**
   * @property {boolean} isCover - Cờ cho biết đây có phải là ảnh bìa (ảnh đại diện) của sân bóng hay không.
   * Mặc định là `false`.
   */
  @ApiProperty({
    description: 'Là ảnh bìa (ảnh đại diện) của sân bóng?',
    default: false,
  })
  @Column({ name: 'is_cover', type: 'boolean', default: false })
  isCover!: boolean;

  /**
   * @description Mối quan hệ Nhiều-Một với thực thể Field.
   * Mỗi hình ảnh thuộc về một sân bóng duy nhất.
   * `onDelete: 'CASCADE'` đảm bảo rằng khi một sân bóng bị xóa, tất cả các hình ảnh liên quan cũng sẽ bị xóa.
   */
  @ManyToOne(() => Field, (field) => field.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field!: Field;
}
