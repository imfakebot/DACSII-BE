import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Role } from './role.entity';
import { UserProfile } from './users-profile.entity';
import { Exclude } from 'class-transformer';
import { AccountStatus } from '../enum/account-status.enum';
import { AuthProvider } from '../enum/auth-provider.enum';

/**
 * @class Account
 * @description Đại diện cho bảng `accounts` trong cơ sở dữ liệu.
 * Lưu trữ thông tin xác thực và trạng thái cốt lõi của người dùng.
 */
@Entity({ name: 'accounts' })
export class Account {
  /**
   * ID duy nhất của tài khoản, được tạo tự động dưới dạng UUID.
   */
  @PrimaryColumn('varchar')
  id!: string;

  /**
   * Địa chỉ email của người dùng, là duy nhất trong hệ thống.
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  /**
   * Mật khẩu đã được hash của người dùng. Có thể là null nếu đăng ký qua OAuth.
   */
  @Column({ type: 'varchar', length: 255, nullable: true }) // Mật khẩu có thể null nếu dùng OAuth
  @Exclude()
  password_hash!: string | null;

  /**
   * Nhà cung cấp xác thực đã được sử dụng để tạo tài khoản (ví dụ: 'credentials', 'google').
   */
  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.CREDENTIALS,
  })
  provider!: AuthProvider;

  /**
   * Trạng thái hiện tại của tài khoản (ví dụ: 'active', 'suspended').
   */
  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status!: AccountStatus;

  /**
   * Cờ cho biết tài khoản đã được xác thực email hay chưa.
   */
  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  /**
   * Dấu thời gian của lần đăng nhập cuối cùng.
   */
  @Column({ type: 'timestamp', nullable: true })
  last_login!: Date;

  /**
   * Cờ cho biết xác thực hai yếu tố (2FA) có được bật hay không.
   */
  @Column({ type: 'boolean', default: false })
  two_factor_enabled!: boolean;

  /**
   * Khóa bí mật được sử dụng để tạo mã 2FA.
   */
  @Column({ type: 'varchar', nullable: true })
  two_factor_secret!: string;

  /**
   * Các mã khôi phục 2FA (thường được lưu dưới dạng hash hoặc chuỗi đã mã hóa).
   */
  @Column({ type: 'text', nullable: true })
  two_factor_recovery_codes!: string | null;

  /**
   * Mã xác thực tạm thời được gửi qua email để hoàn tất đăng ký.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  verification_code!: string | null;

  /**
   * Dấu thời gian khi mã xác thực hết hạn.
   */
  @Column({ type: 'timestamp', nullable: true })
  verification_code_expires_at!: Date | null;

  /**
   * Refresh token đã được hash, dùng để quản lý phiên đăng nhập.
   */
  @Column({ type: 'varchar', default: null })
  @Exclude()
  hashed_refresh_token!: string | null;

  /**
   * Token dùng cho việc đặt lại mật khẩu, bản hash được lưu để bảo mật.
   */
  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  password_reset_token?: string | null;

  /**
   * Dấu thời gian khi token đặt lại mật khẩu hết hạn.
   */
  @Column({ name: 'password_reset_expires', type: 'datetime', nullable: true })
  password_reset_expires?: Date | null;

  /**
   * Dấu thời gian khi tài khoản được tạo.
   */
  @CreateDateColumn({
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  /**
   * Dấu thời gian khi tài khoản được cập nhật lần cuối.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  /**
   * Mối quan hệ nhiều-một với Role, xác định vai trò của tài khoản.
   */
  @ManyToOne(() => Role, (role) => role.accounts)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  /**
   * Mối quan hệ một-một với UserProfile, chứa thông tin hồ sơ chi tiết.
   * `cascade: true` đảm bảo UserProfile được lưu cùng lúc với Account.
   */
  @OneToOne(() => UserProfile, (userProfile) => userProfile.account, {
    cascade: true,
  })
  @JoinColumn({ name: 'user_profile_id' })
  userProfile!: UserProfile;

  /**
   * Hook này của TypeORM sẽ tự động được gọi trước khi một thực thể mới được chèn vào cơ sở dữ liệu.
   * Nó đảm bảo rằng mọi tài khoản mới đều có một ID duy nhất.
   */
  @BeforeInsert()
  generateId() {
    // Chỉ tạo ID nếu nó chưa tồn tại
    if (!this.id) {
      // Phương pháp ưu tiên là sử dụng thư viện `uuid` đã được cài đặt.
      // Nó đáng tin cậy và hoạt động trên mọi môi trường.
      this.id = uuidv4();
    }
  }
}
