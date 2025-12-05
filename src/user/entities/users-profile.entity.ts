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
// import { Field } from '@/field/entities/field.entity'; <--- Có thể xóa import này nếu không dùng nữa
import { Exclude } from 'class-transformer';
import { Gender } from '../enum/gender.enum';
import { Branch } from '@/branch/entities/branch.entity';

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @PrimaryColumn('varchar')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  // --- BẮT BUỘC THÊM CỘT NÀY ĐỂ FIX LỖI Ở FIELDS.SERVICE ---
  @Column({ type: 'varchar', default: 'user' })
  role!: string;
  // --------------------------------------------------------

  @Exclude()
  @Column({ type: 'date', nullable: true })
  date_of_birth!: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender | null;

  @Exclude()
  @Column({ unique: true })
  phone_number!: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatar_url?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @Column({ type: 'boolean', default: false })
  is_profile_complete!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Exclude()
  @OneToOne(() => Account, (account) => account.userProfile)
  account!: Account;

  @Exclude()
  @OneToMany(() => Booking, (booking) => booking.userProfile)
  bookings!: Booking[];

  // ------------------------------------------------------------------
  // XÓA ĐOẠN NÀY ĐI VÌ FIELD KHÔNG CÓ CỘT OWNER_ID
  // @OneToMany(() => Field, (field) => field.owner)
  // ownerFields!: Field[];
  // ------------------------------------------------------------------

  @ManyToOne(() => Branch, (branch) => branch.staffMembers, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }
}