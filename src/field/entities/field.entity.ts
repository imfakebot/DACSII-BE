import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { FieldType } from './field-types.entity';
import { FieldImage } from './field-image.entity';
import { Utility } from './utility.entity';
import { Booking } from '@/booking/entities/booking.entity';
import { Review } from '@/review/entities/review.entity';
// 👇 Import Branch (nhớ kiểm tra đường dẫn import cho đúng alias của bạn)
import { Branch } from '@/branch/entities/branch.entity';

@Entity({ name: 'fields' })
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'boolean', default: true })
  status!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  // --- CÁC QUAN HỆ ---

  /**
   * Mỗi sân bóng thuộc về một loại sân (5 người, 7 người...)
   */
  @ManyToOne(() => FieldType, (fieldType) => fieldType.fields)
  @JoinColumn({ name: 'field_type_id' })
  fieldType!: FieldType;

  /**
   * 👇 QUAN HỆ MỚI: Mỗi sân bóng thuộc về một Chi nhánh
   * Dùng hàm mũi tên () => Branch để tránh lỗi Circular Dependency
   */
  @ManyToOne(() => Branch, (branch) => branch.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @OneToMany(() => FieldImage, (image: FieldImage) => image.field)
  images!: FieldImage[];

  @OneToMany(() => Booking, (booking) => booking.field)
  bookings!: Booking[];

  @ManyToMany(() => Utility, (utility) => utility.fields)
  @JoinTable({
    name: 'field_utilities',
    joinColumn: { name: 'field_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'utility_id', referencedColumnName: 'id' },
  })
  utilities!: Utility[];

  @OneToMany(() => Review, (review) => review.field)
  reviews!: Review[];
}