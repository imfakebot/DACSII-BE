import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Field } from './field.entity';
import { TimeSlot } from '@/pricing/entities/time-slot.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @entity FieldType
 * @description Đại diện cho một loại sân bóng trong cơ sở dữ liệu (ví dụ: sân 5 người, sân 7 người).
 * Nó giúp phân loại các sân bóng và có thể liên quan đến các khung giờ và giá cả khác nhau.
 */
@Entity({ name: 'field_types' })
export class FieldType {
  /**
   * @property {string} id - ID duy nhất của loại sân (UUID).
   */
  @ApiProperty({
    description: 'ID duy nhất của loại sân',
    format: 'uuid',
  })
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  /**
   * @property {string} name - Tên của loại sân (ví dụ: "Sân 5 người").
   */
  @ApiProperty({
    description: 'Tên của loại sân',
    example: 'Sân 5 người',
  })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * @property {string} description - Mô tả chi tiết về loại sân.
   * @description Có thể để trống (nullable).
   */
  @ApiProperty({
    description: 'Mô tả chi tiết về loại sân',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description!: string;

  /**
   * @description Mối quan hệ Một-Nhiều với thực thể Field.
   * Một loại sân có thể có nhiều sân bóng thuộc loại đó.
   */
  @OneToMany(() => Field, (field) => field.fieldType)
  fields!: Field[];

  /**
   * @description Mối quan hệ Một-Nhiều với thực thể TimeSlot.
   * Một loại sân có thể có nhiều khung giờ với các mức giá khác nhau.
   */
  @OneToMany(() => TimeSlot, (timeSlot) => timeSlot.fieldType)
  timeSlots!: TimeSlot[];
}
