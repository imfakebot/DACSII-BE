import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'FieldTypes' })
export class FieldTypes {
  @PrimaryColumn('varchar')
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;
}
