import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { FieldTypes } from './field-types.entity';

import { UserProfile } from '../../users/entities/users-profile.entity';

import { Address } from '../../locations/entities/address.entity';
@Entity({ name: 'fields' }) // SỬA 1: Dùng tên bảng chữ thường
export class Fields {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // SỬA 2: Đổi từ number sang string

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'boolean', default: true })
  status!: boolean; // Tốt, đã khớp với DB

  // SỬA 3: Quan hệ với FieldTypes
  @ManyToOne(() => FieldTypes)
  @JoinColumn({ name: 'field_type_id' }) // Đổi sang snake_case cho nhất quán
  fieldType!: FieldTypes;

  // SỬA 4: Bổ sung quan hệ với Addresses (BẮT BUỘC)
  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address!: Address;

  // SỬA 5: Bổ sung quan hệ với UserProfile (Owner) (BẮT BUỘC)
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'owner_id' })
  owner!: UserProfile;
}
