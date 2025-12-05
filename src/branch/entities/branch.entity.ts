import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { Address } from '@/location/entities/address.entity';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Field } from '@/field/entities/field.entity';

@Entity('branches')
export class Branch {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 150 })
    name!: string;

    @Column({ length: 15, nullable: true })
    phone_number!: string;

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({ type: 'boolean', default: true }) // SQL: tinyint(1) -> TypeORM: boolean
    status!: boolean; // true: Hoạt động, false: Tạm dừng

    @Column({ type: 'time', default: '05:00:00' })
    open_time!: string; // TypeORM map kiểu Time về string (HH:MM:SS)

    @Column({ type: 'time', default: '23:00:00' })
    close_time!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @Column({ name: 'manager_id', nullable: true })
    manager_id!: string;

    // --- RELATIONS (QUAN HỆ) ---

    // 1. Quan hệ với Address (1-1)
    @OneToOne(() => Address)
    @JoinColumn({ name: 'address_id' })
    address!: Address;

    // 2. Quan hệ với Manager (Người quản lý chi nhánh) (N-1)
    @ManyToOne(() => UserProfile)
    @JoinColumn({ name: 'manager_id' })
    manager!: UserProfile;

    // 3. Quan hệ với Sân bóng (1-N)
    @OneToMany(() => Field, (field) => field.branch)
    fields!: Field[];

    // 4. Quan hệ với Nhân viên (Staff) (1-N)
    // Trường này để truy vấn danh sách nhân viên thuộc chi nhánh này
    @OneToMany(() => UserProfile, (profile) => profile.branch)
    staffMembers!: UserProfile[];
}