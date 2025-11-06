import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'UsersProfile' })
export class UserProfile {
    @PrimaryGeneratedColumn()
    id?: string;

    @Column()
    fullname?: string;

    @Column()
    dateofbirth?: Date;

    @Column({ unique: true })
    phonenumber?: string;

    @Column()
    avatarURL?: string;

    @Column()
    bio?: string;

    @Column()
    createdAt?: Date;
}