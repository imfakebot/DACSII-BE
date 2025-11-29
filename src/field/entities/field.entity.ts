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
import { UserProfile } from '../../user/entities/users-profile.entity';
import { Address } from '../../location/entities/address.entity';
import { FieldImage } from './field-image.entity';
import { Utility } from './utility.entity';
import { Booking } from '@/booking/entities/booking.entity';
import { Review } from '@/review/entities/review.entity';

/**
 * @entity Field
 * @description Đại diện cho một sân bóng trong cơ sở dữ liệu.
 * Đây là entity trung tâm, lưu trữ thông tin chi tiết về sân bóng
 * và các mối quan hệ với chủ sở hữu, địa chỉ, loại sân, hình ảnh, tiện ích và các lượt đặt sân.
 */
@Entity({ name: 'fields' })
export class Field {
  /**
   * @property {string} id - ID duy nhất của sân bóng (UUID).
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * @property {string} name - Tên của sân bóng.
   */
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  /**
   * @property {string} description - Mô tả chi tiết về sân bóng.
   * @description Có thể để trống (nullable).
   */
  @Column({ type: 'text', nullable: true })
  description!: string;

  /**
   * @property {boolean} status - Trạng thái hoạt động của sân bóng.
   * @description `true` là đang hoạt động, `false` là tạm ngưng. Mặc định là `true`.
   */
  @Column({ type: 'boolean', default: true })
  status!: boolean;

  /**
   * @property {Date} createdAt - Thời điểm sân bóng được tạo.
   * Tự động được gán bởi TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * @property {Date} updatedAt - Thời điểm sân bóng được cập nhật lần cuối.
   * Tự động được gán bởi TypeORM.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * @property {Date | null} deletedAt - Dấu thời gian khi sân bóng bị xóa mềm.
   * @description Nếu giá trị là `null`, sân bóng chưa bị xóa. TypeORM sẽ tự động quản lý cột này khi dùng `softDelete` hoặc `softRemove`.
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  /**
   * @description Mối quan hệ Nhiều-Một với FieldType.
   * Mỗi sân bóng thuộc về một loại sân (ví dụ: sân 5 người).
   */
  @ManyToOne(() => FieldType, (fieldType) => fieldType.fields)
  @JoinColumn({ name: 'field_type_id' })
  fieldType!: FieldType;

  /**
   * @description Mối quan hệ Nhiều-Một với Address.
   * Mỗi sân bóng có một địa chỉ.
   */
  @ManyToOne(() => Address, (address) => address.fields)
  @JoinColumn({ name: 'address_id' })
  address!: Address;

  /**
   * @description Mối quan hệ Nhiều-Một với UserProfile.
   * Mỗi sân bóng thuộc sở hữu của một người dùng (chủ sân).
   */
  @ManyToOne(
    () => UserProfile,
    (userProfile: UserProfile) => userProfile.ownerFields,
  )
  @JoinColumn({ name: 'owner_id' })
  owner!: UserProfile;

  /**
   * @description Mối quan hệ Một-Nhiều với FieldImage.
   * Một sân bóng có thể có nhiều hình ảnh.
   */
  @OneToMany(() => FieldImage, (image: FieldImage) => image.field)
  images!: FieldImage[];

  /**
   * @description Mối quan hệ Một-Nhiều với Booking.
   * Một sân bóng có thể có nhiều lượt đặt sân.
   */
  @OneToMany(() => Booking, (booking) => booking.field)
  bookings!: Booking[];

  /**
   * @description Mối quan hệ Nhiều-Nhiều với Utility.
   * Một sân bóng có thể có nhiều tiện ích (wifi, nước uống,...) và một tiện ích có thể có ở nhiều sân.
   * TypeORM sẽ tạo bảng trung gian `field_utilities` để quản lý mối quan hệ này.
   */
  @ManyToMany(() => Utility, (utility) => utility.fields)
  @JoinTable({
    name: 'field_utilities',
    joinColumn: { name: 'field_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'utility_id', referencedColumnName: 'id' },
  })
  utilities!: Utility[];

  /**
   * @description Mối quan hệ Một-Nhiều với Review.
   * Một sân bóng có thể nhận được nhiều đánh giá từ người dùng.
   */
  @OneToMany(() => Review, (review) => review.field)
  reviews!: Review[];
}
