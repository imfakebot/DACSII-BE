import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Account } from "./account.entity";
import { v4 as uuidv4 } from 'uuid';
import { Address } from "./address.entity";

@Entity({ name: 'user_profiles' })
export class UserProfile {
    @PrimaryColumn('varchar')
    id?: string;

    @Column({ type: 'varchar', length: 255 })
    full_name?: string;

    @Column({ type: 'date', nullable: true })
    date_of_birth?: Date;

    // SỬA ĐỔI 1: Thêm "nullable: true" để cho phép cột này nhận giá trị NULL
    @Column({ type: 'varchar', nullable: true })
    gender?: string | null;

    @Column({ unique: true })
    phone_number?: string;

    @Column({ nullable: true })
    avatar_URL?: string;

    @Column({ type: 'text', nullable: true })
    bio?: string | null;

    @CreateDateColumn()
    created_at?: Date;

    @UpdateDateColumn()
    updated_at?: Date;


    @OneToOne(() => Account, (account) => account.userProfile)
    account?: Account;

    @Column({ name: 'address_id', type: 'varchar', length: 36, nullable: true })
    address_id?: string;

    @OneToOne(() => Address)
    @JoinColumn({ name: 'address_id' })
    address?: Address;

    @BeforeInsert()
    generateId() {
        if (!this.id)
            this.id = uuidv4();
    }
}