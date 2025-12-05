import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from '@/booking/entities/booking.entity';
import { Exclude } from 'class-transformer';
import { Gender } from '../enum/gender.enum';
import { Branch } from '@/branch/entities/branch.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('varchar')
  id!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  @ApiProperty({ example: 'user' })
  @Column({ type: 'varchar', default: 'user' })
  role!: string;

  @Exclude()
  @Column({ type: 'date', nullable: true })
  date_of_birth!: Date;

  @ApiProperty({ enum: Gender, example: Gender.MALE, required: false })
  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender | null;

  @Exclude()
  @Column({ unique: true })
  phone_number!: string;

  @ApiProperty({
    example: '/uploads/avatar.jpg',
    required: false,
  })
  @Column({ name: 'avatar_url', nullable: true })
  avatar_url?: string;

  @ApiProperty({ example: 'Thích đá bóng', required: false })
  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @ApiProperty({
    description: 'Cờ báo hiệu hồ sơ đã hoàn chỉnh hay chưa',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  is_profile_complete!: boolean;

  @ApiProperty()
  @CreateDateColumn()
  created_at!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updated_at!: Date;

  @Exclude()
  @OneToOne(() => Account, (account) => account.userProfile)
  account!: Account;

  @Exclude()
  @OneToMany(() => Booking, (booking) => booking.userProfile)
  bookings!: Booking[];

  @ApiProperty({ type: () => Branch, required: false })
  @ManyToOne(() => Branch, (branch) => branch.staffMembers, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}
