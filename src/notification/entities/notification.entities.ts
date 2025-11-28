import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserProfile } from '@/user/entities/users-profile.entity';

/**
 * @class Notification
 * @description Đại diện cho bảng `notifications` trong cơ sở dữ liệu.
 * Lưu trữ thông tin về một thông báo được gửi đến người dùng.
 */
@Entity({ name: 'notifications' })
export class Notification {
  /**
   * ID duy nhất của thông báo, được tạo tự động dưới dạng UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Tiêu đề của thông báo.
   */
  @Column()
  title!: string;

  /**
   * Nội dung chi tiết của thông báo.
   */
  @Column('text')
  content!: string;

  /**
   * Trạng thái đã đọc của thông báo.
   * `true` nếu người dùng đã đọc, `false` nếu chưa. Mặc định là `false`.
   */
  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  /**
   * Dấu thời gian khi thông báo được tạo.
   * Được tự động gán bởi TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Mối quan hệ Nhiều-Một với thực thể UserProfile.
   * Mỗi thông báo thuộc về một người nhận (recipient) duy nhất.
   * Cột `recipient_id` trong bảng `notifications` sẽ là khóa ngoại tham chiếu đến `id` của `user_profiles`.
   */
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'recipient_id' })
  recipient!: UserProfile;
}
