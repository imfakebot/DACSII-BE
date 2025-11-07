import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
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

    @Column({ type: 'varchar' })
    gender?: string;

    @Column({ unique: true })
    phone_number?: string;

    @Column()
    avatarURL?: string;

    @Column()
    bio?: string;

    @CreateDateColumn()
    created_at?: Date;

    @Column()
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