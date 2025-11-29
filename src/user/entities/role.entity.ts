import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

/**
 * @class Role
 * @description Đại diện cho bảng `roles` trong cơ sở dữ liệu.
 * Lưu trữ các vai trò khác nhau trong hệ thống (ví dụ: 'Admin', 'User').
 */
@Entity({ name: 'roles' })
export class Role {
  /**
   * ID duy nhất của vai trò, được tạo tự động.
   * Thường là một số nguyên tự tăng.
   */
  @PrimaryGeneratedColumn()
  id!: string;

  /**
   * Tên của vai trò, phải là duy nhất để dễ dàng nhận dạng.
   * Ví dụ: 'ADMIN', 'USER', 'OWNER'.
   */
  @Column()
  name!: string;

  /**
   * Mối quan hệ một-nhiều với thực thể Account.
   * Một vai trò có thể được gán cho nhiều tài khoản.
   */
  @OneToMany(() => Account, (account) => account.role)
  accounts!: Account[];
}
