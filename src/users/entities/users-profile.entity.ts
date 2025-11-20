import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from '@/bookings/entities/booking.entity';
import { Field } from '@/fields/entities/field.entity';

/**
 * Enum định nghĩa các giá trị hợp lệ cho giới tính.
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
/**
 * @class UserProfile
 * @description Đại diện cho bảng `user_profiles` trong cơ sở dữ liệu.
 * Lưu trữ thông tin hồ sơ chi tiết của người dùng.
 */
@Entity({ name: 'user_profiles' })
export class UserProfile {
  /**
   * ID duy nhất của hồ sơ, được tạo tự động dưới dạng UUID.
   */
  @PrimaryColumn('varchar')
  id!: string;

  /**
   * Họ và tên đầy đủ của người dùng.
   */
  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  /**
   * Ngày sinh của người dùng.
   */
  @Column({ type: 'date', nullable: true })
  date_of_birth!: Date;

  /**
   * Giới tính của người dùng.
   */
  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender | null;

  /**
   * Số điện thoại của người dùng, phải là duy nhất.
   */
  @Column({ unique: true })
  phone_number!: string;

  /**
   * URL đến ảnh đại diện của người dùng.
   */
  @Column({ name: 'avatar_url', nullable: true })
  avatar_url?: string;

  /**
   * Tiểu sử hoặc mô tả ngắn về người dùng.
   */
  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  /**
   * Cờ cho biết người dùng đã hoàn thành việc cập nhật hồ sơ lần đầu hay chưa.
   */
  @Column({ type: 'boolean', default: false })
  is_profile_complete!: boolean;

  /**
   * Dấu thời gian khi hồ sơ được tạo.
   */
  @CreateDateColumn()
  created_at!: Date;

  /**
   * Dấu thời gian khi hồ sơ được cập nhật lần cuối.
   */
  @UpdateDateColumn()
  updated_at!: Date;

  /**
   * Mối quan hệ một-một ngược lại với thực thể Account.
   */
  @OneToOne(() => Account, (account) => account.userProfile)
  account!: Account;

  @OneToMany(() => Booking, (booking) => booking.userProfile)
  bookings!: Booking[];

  @OneToMany(() => Field, (field) => field.owner)
  ownerFields!: Field[];


  /**
   * Hook tự động tạo ID trước khi lưu vào cơ sở dữ liệu.
   */
  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}
