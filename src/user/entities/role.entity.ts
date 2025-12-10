import { ApiProperty } from '@nestjs/swagger';
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
   * ID duy nhất của vai trò, là một số nguyên tự tăng.
   */
  @ApiProperty({ description: 'ID duy nhất của vai trò', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Tên của vai trò, phải là duy nhất để dễ dàng nhận dạng.
   */
  @ApiProperty({ description: 'Tên của vai trò', example: 'super_admin' })
  @Column({ unique: true, length: 50 })
  name!: string;

  /**
   * Mối quan hệ một-nhiều với thực thể Account.
   */
  @OneToMany(() => Account, (account) => account.role)
  accounts!: Account[];
}
