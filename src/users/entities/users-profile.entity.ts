import { BeforeInsert, Column, CreateDateColumn, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { Account } from "./account.entity";
import { v4 as uuidv4 } from 'uuid';
@Entity({ name: 'UsersProfile' })
export class UserProfile {
    @PrimaryColumn('varchar')
    id?: string;

    @Column()
    fullName?: string;

    @Column()
    dateOfBirth?: Date;

    @Column({ unique: true })
    phoneNumber?: string;

    @Column()
    avatarURL?: string;

    @Column()
    bio?: string;

    @CreateDateColumn()
    createdAt?: Date;

    @OneToOne(() => Account, (account) => account.userProfileID)
    account?: Account;

    @BeforeInsert()
    generateId() {
        if (!this.id)
            this.id = uuidv4();
    }

}