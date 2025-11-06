import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'Role' })
export class Role {
    @PrimaryGeneratedColumn()
    id?: string;

    @Column()
    name?: string;
}