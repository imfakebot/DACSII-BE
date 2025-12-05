import { FieldType } from '@/field/entities/field-types.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'time_slots' })
export class TimeSlot {
  @ApiProperty({ description: 'ID của khung giờ', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'Thời gian bắt đầu', example: '05:00:00' })
  @Column({ name: 'start_time', type: 'time' })
  start_time!: string;

  @ApiProperty({ description: 'Thời gian kết thúc', example: '07:00:00' })
  @Column({ name: 'end_time', type: 'time' })
  end_time!: string;

  @ApiProperty({ description: 'Giá tiền cho khung giờ này', example: 250000 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @ApiProperty({ description: 'Là khung giờ cao điểm?', example: false })
  @Column({ name: 'is_peak_hour', type: 'boolean', default: false })
  is_peak_hour!: boolean;

  @ManyToOne(() => FieldType, (fieldType) => fieldType.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'field_type_id' })
  fieldType!: FieldType;
}
