import { BeforeInsert, Column, Entity, OneToOne, PrimaryColumn, JoinColumn } from "typeorm";
import { v4 as uuidv4 } from 'uuid';
import { UserProfile } from "./users-profile.entity";

@Entity({ name: 'addresses' })
export class Address {
    @PrimaryColumn('varchar')
    id?: string;

    @Column({ type: 'varchar', length: 255 })
    street?: string;

    @Column({ name: 'ward_id' })
    ward_id?: number;

    @Column({ name: 'city_id' })
    city_id?: number;

    @BeforeInsert()
    generateId() {
        if (!this.id) this.id = uuidv4();
    }

    @OneToOne(() => UserProfile, userProfile => userProfile.address)
    @JoinColumn({ name: 'id' }) // Assuming address_id in UserProfile references Address.id
    userProfile: UserProfile | undefined;
}