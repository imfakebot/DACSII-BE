import { FieldType } from '@/fields/entities/field-types.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'time_slots' })
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'start_time', type: 'time' })
  start_time!: string;

  @Column({ name: 'end_time', type: 'time' })
  end_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'is_peak_hour', type: 'boolean', default: false })
  is_peak_hour!: boolean;

  @ManyToOne(() => FieldType, (fieldType) => fieldType.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'field_type_id' })
  fieldType!: FieldType;

}
