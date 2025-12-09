import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from '@/location/entities/address.entity';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Field } from '@/field/entities/field.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class Branch
 * @description Đại diện cho một chi nhánh hoặc một cơ sở sân bóng cụ thể trong hệ thống.
 * Mỗi chi nhánh có thông tin riêng, địa chỉ, giờ hoạt động và quản lý các sân bóng, nhân viên thuộc về nó.
 */
@Entity('branches')
export class Branch {
  /**
   * ID duy nhất của chi nhánh, định dạng UUID.
   */
  @ApiProperty({
    description: 'ID duy nhất của chi nhánh',
    format: 'uuid',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Tên của chi nhánh.
   * @example 'Sân bóng ABC - Cơ sở 1'
   */
  @ApiProperty({
    description: 'Tên của chi nhánh',
    example: 'Sân bóng ABC - Cơ sở 1',
  })
  @Column({ length: 150 })
  name!: string;

  /**
   * Số điện thoại liên hệ (hotline) của chi nhánh.
   */
  @ApiProperty({
    description: 'Số điện thoại liên hệ của chi nhánh',
    example: '02838123456',
    required: false,
  })
  @Column({ length: 15, nullable: true })
  phone_number!: string;

  /**
   * Mô tả chi tiết về chi nhánh (cơ sở vật chất, đường đi, v.v.).
   */
  @ApiProperty({
    description: 'Mô tả chi tiết về chi nhánh',
    example: 'Cơ sở có 5 sân 5 và 2 sân 7, có căng tin và bãi giữ xe rộng rãi.',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description!: string;

  /**
   * Trạng thái hoạt động của chi nhánh.
   * `true` là đang hoạt động, `false` là tạm dừng.
   */
  @ApiProperty({
    description: 'Trạng thái hoạt động (true: hoạt động, false: tạm dừng)',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  status!: boolean;

  /**
   * Giờ mở cửa của chi nhánh.
   * @example '05:00:00'
   */
  @ApiProperty({ description: 'Giờ mở cửa', example: '05:00:00' })
  @Column({ type: 'time', default: '05:00:00' })
  open_time!: string;

  /**
   * Giờ đóng cửa của chi nhánh.
   * @example '23:00:00'
   */
  @ApiProperty({ description: 'Giờ đóng cửa', example: '23:00:00' })
  @Column({ type: 'time', default: '23:00:00' })
  close_time!: string;

  /**
   * Thời điểm chi nhánh được tạo.
   */
  @ApiProperty({ description: 'Thời điểm tạo' })
  @CreateDateColumn()
  created_at!: Date;

  /**
   * Thời điểm thông tin chi nhánh được cập nhật lần cuối.
   */
  @ApiProperty({ description: 'Thời điểm cập nhật lần cuối' })
  @UpdateDateColumn()
  updated_at!: Date;

  /**
   * ID của người quản lý chi nhánh (tham chiếu đến UserProfile).
   */
  @ApiProperty({
    description: 'ID của người quản lý (UserProfile)',
    format: 'uuid',
    required: false,
  })
  @Column({ name: 'manager_id', nullable: true })
  manager_id!: string | null;

  /**
   * ID của tài khoản đã tạo chi nhánh (tham chiếu đến UserProfile).
   */
  @ApiProperty({
    description: 'ID của người tạo (UserProfile)',
    format: 'uuid',
    required: false,
  })
  @Column({ name: 'created_by_id', nullable: true })
  created_by_id!: string | null;

  // --- RELATIONS (QUAN HỆ) ---

  /**
   * Mối quan hệ 1-1 với Address. Mỗi chi nhánh có một địa chỉ duy nhất.
   */
  @ApiProperty({ type: () => Address })
  @OneToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address!: Address;

  /**
   * Mối quan hệ N-1 với UserProfile. Mỗi chi nhánh được quản lý bởi một người dùng.
   */
  @ApiProperty({ type: () => UserProfile })
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'manager_id' })
  manager!: UserProfile;

  /**
   * Mối quan hệ N-1 với UserProfile. Mỗi chi nhánh được tạo bởi một người dùng.
   */
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'created_by_id' })
  created_by!: UserProfile;

  /**
   * Mối quan hệ 1-N với Field. Một chi nhánh có thể có nhiều sân bóng.
   */
  @OneToMany(() => Field, (field) => field.branch)
  fields!: Field[];

  /**
   * Mối quan hệ 1-N với UserProfile. Một chi nhánh có thể có nhiều nhân viên.
   */
  @OneToMany(() => UserProfile, (profile) => profile.branch)
  staffMembers!: UserProfile[];
}
