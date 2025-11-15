import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToOne, BeforeInsert } from "typeorm";
import { v4 as uuidv4 } from 'uuid';
import { Role } from "./role.entity";
import { UserProfile } from "./users-profile.entity";

@Entity({ name: 'accounts' })
export class Account {
    @PrimaryColumn('varchar')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email!: string;

    @Column({ type: 'varchar', length: 255, nullable: true }) // Mật khẩu có thể null nếu dùng OAuth
    password_hash!: string;

    @Column({ type: 'varchar', length: 255, default: 'credentials' }) // e.g., 'credentials', 'google', 'facebook'
    provider!: string;

    @Column({ type: 'varchar', default: 'active' }) // e.g., 'active', 'suspended', 'deleted'
    status!: string;

    @Column({ type: 'boolean', default: false })
    is_verified!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    last_login!: Date;

    @Column({ type: 'boolean', default: false })
    two_factor_enabled!: boolean;

    @Column({ type: 'varchar', nullable: true })
    two_factor_secret!: string;

    @Column({ type: 'text', nullable: true })
    two_factor_recovery_codes!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    verification_code!: string;

    @Column({ type: 'timestamp', nullable: true })
    verification_code_expires_at!: Date;

    @Column({ type: 'varchar', length: 255, unique: true })
    user_profile_id!: string;


    @ManyToOne(() => Role, (role) => role.accounts, { eager: true })
    @JoinColumn({ name: 'role_id' })
    role!: Role;

    @OneToOne(() => UserProfile, (userProfile) => userProfile.account, { eager: true })
    @JoinColumn({ name: 'user_profile_id' })
    userProfile!: UserProfile;

    /**
     * Hook này của TypeORM sẽ tự động được gọi trước khi một thực thể mới được chèn vào cơ sở dữ liệu.
     * Nó đảm bảo rằng mọi tài khoản mới đều có một ID duy nhất.
     */
    @BeforeInsert()
    generateId() {
        // Chỉ tạo ID nếu nó chưa tồn tại
        if (!this.id) {
            // Phương pháp ưu tiên là sử dụng thư viện `uuid` đã được cài đặt.
            // Nó đáng tin cậy và hoạt động trên mọi môi trường.
            this.id = uuidv4();
        }
    }
}
