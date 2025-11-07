import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToOne, BeforeInsert } from "typeorm";
import { Role } from "./role.entity";
import { UserProfile } from "./users-profile.entity";
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'accounts' })
export class Account {
    @PrimaryColumn('varchar')
    id?: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email?: string;

    @Column({ type: 'varchar', length: 255 })
    password_hash?: string;

    @Column({ type: 'varchar', length: 255 })
    provider?: string;

    @Column({ type: 'varchar', default: 'active' })
    status?: string;

    @Column({ type: 'boolean', default: false })
    is_verified?: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    last_login?: Date;

    @Column({ type: 'boolean', default: false })
    two_factor_enabled?: boolean;

    @Column({ type: 'varchar', nullable: true })
    two_factor_secret?: string;

    @Column({ type: 'text', nullable: true })
    two_factor_recovery_codes?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    verification_code?: string;

    @Column({ type: 'timestamp', nullable: true })
    verification_code_expires_at?: Date;

    @Column({ type: 'varchar', length: 255, unique: true })
    user_profile_id?: string;


    @ManyToOne(() => Role, (role) => role.accounts, { eager: true })
    @JoinColumn({ name: 'role_id' })
    role?: Role;

    @OneToOne(() => UserProfile, (userProfile) => userProfile.account, { eager: true })
    @JoinColumn({ name: 'user_profile_id' })
    userProfile?: UserProfile;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            // Safely call uuidv4 only if it's a function, otherwise fallback to crypto.randomUUID if available,
            // or coerce the result via a safe cast to string to satisfy the type checker.
            if (typeof uuidv4 === 'function') {
                this.id = (uuidv4 as unknown as () => string)();
            } else if (typeof (globalThis as { crypto?: { randomUUID?: () => string } })?.crypto?.randomUUID === 'function') {
                this.id = (globalThis as { crypto: { randomUUID: () => string } }).crypto.randomUUID();
            } else {
                // Last-resort fallback (stable-ish, not cryptographically strong)
                this.id = 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
            }
        }
    }
}