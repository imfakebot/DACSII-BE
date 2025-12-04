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
import { Booking } from '@/booking/entities/booking.entity';
import { Field } from '@/field/entities/field.entity';
import { Exclude } from 'class-transformer'; // Đảm bảo đã import
import { Gender } from '../enum/gender.enum';

/**
 * @class UserProfile
 * @description Đại diện cho bảng `user_profiles` trong cơ sở dữ liệu.
 * Lưu trữ thông tin cá nhân chi tiết của người dùng, tách biệt với thông tin xác thực.
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
   * @Exclude Được ẩn đi khi trả về cho client để bảo vệ thông tin cá nhân.
   */
  @Exclude()
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
   * Số điện thoại của người dùng, là duy nhất trong hệ thống.
   * @Exclude Được ẩn đi khi trả về cho client để bảo vệ thông tin cá nhân.
   */
  @Exclude()
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
   * Cờ cho biết hồ sơ đã được hoàn thiện hay chưa.
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
   * Mối quan hệ một-một ngược với Account.
   * @Exclude Cực kỳ quan trọng để không làm lộ thông tin nhạy cảm từ bảng Account (như email, password_hash) khi serialize.
   */
  @Exclude()
  @OneToOne(() => Account, (account) => account.userProfile)
  account!: Account;

  /**
   * Mối quan hệ một-nhiều với Booking. Một hồ sơ người dùng có thể có nhiều lượt đặt sân.
   * @Exclude Bảo vệ lịch sử giao dịch, không trả về kèm theo thông tin hồ sơ cơ bản.
   */
  @Exclude()
  @OneToMany(() => Booking, (booking) => booking.userProfile)
  bookings!: Booking[];

  /**
   * Mối quan hệ một-nhiều với Field. Một người dùng có thể sở hữu nhiều sân.
   * Trường này có thể giữ lại để biết user này sở hữu sân nào (nếu muốn công khai).
   */
  @OneToMany(() => Field, (field) => field.owner)
  ownerFields!: Field[];

  /**
   * Hook của TypeORM, tự động tạo ID dạng UUID trước khi lưu vào cơ sở dữ liệu.
   */
  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}