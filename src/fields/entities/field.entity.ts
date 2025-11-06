import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { FieldTypes } from "./field-types.entity";


@Entity({ name: 'Fields' })
export class Fields {

    @PrimaryColumn('varchar')
    id?: number;

    @Column({ type: 'varchar', length: 255 })
    name?: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'boolean', default: true })
    status?: boolean;

    @ManyToOne(() => FieldTypes, (fieldType) => fieldType.id, { eager: true })
    @JoinColumn({ name: 'fieldTypeId' })
    fieldType?: FieldTypes;


}
