import {
  BeforeInsert,
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
import { v4 as uuidv4 } from 'uuid';
import { FieldType } from './field-types.entity';
import { FieldImage } from './field-image.entity';
import { Utility } from '../../utility/entities/utility.entity';
import { Booking } from '@/booking/entities/booking.entity';
import { Review } from '@/review/entities/review.entity';
import { Branch } from '@/branch/entities/branch.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class Field
 * @description Đại diện cho một sân bóng cụ thể trong hệ thống.
 */
@Entity({ name: 'fields' })
export class Field {
  @ApiProperty({ description: 'ID duy nhất của sân bóng', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Tên sân bóng', example: 'Sân 5A' })
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về sân',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description!: string;

  @ApiProperty({
    description: 'Trạng thái hoạt động (true: hoạt động, false: tạm ngưng)',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  status!: boolean;

  @ApiProperty({ description: 'Thời điểm tạo' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Thời điểm cập nhật lần cuối' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  // --- CÁC QUAN HỆ ---

  @ApiProperty({ type: () => FieldType })
  @ManyToOne(() => FieldType, (fieldType) => fieldType.fields)
  @JoinColumn({ name: 'field_type_id' })
  fieldType!: FieldType;

  @ApiProperty({ type: () => Branch })
  @ManyToOne(() => Branch, (branch) => branch.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @ApiProperty({ type: () => [FieldImage] })
  @OneToMany(() => FieldImage, (image: FieldImage) => image.field)
  images!: FieldImage[];

  @OneToMany(() => Booking, (booking) => booking.field)
  bookings!: Booking[];

  @ApiProperty({ type: () => [Utility] })
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
