import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column()
  name!: string;

  @OneToMany(() => Account, (account) => account.role)
  accounts!: Account[];
}
