import { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceForeignKeys1779361700000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Đảm bảo dữ liệu hợp lệ trước khi thêm FK (Xóa hoặc cập nhật các bản ghi mồ côi nếu cần)
        // Trong trường hợp này, chúng ta giả định dữ liệu sạch hoặc người dùng sẽ tự dọn dẹp.
        
        // 2. Thêm FK từ accounts.user_profile_id -> user_profiles.id
        await queryRunner.query(`ALTER TABLE \`accounts\` ADD CONSTRAINT \`FK_accounts_user_profile\` FOREIGN KEY (\`user_profile_id\`) REFERENCES \`user_profiles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);

        // 3. Thêm FK từ user_profiles.branch_id -> branches.id
        await queryRunner.query(`ALTER TABLE \`user_profiles\` ADD CONSTRAINT \`FK_user_profiles_branch\` FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        
        // 4. (Tùy chọn) Thêm các FK khác nếu thiếu, ví dụ role_id trong accounts
        await queryRunner.query(`ALTER TABLE \`accounts\` ADD CONSTRAINT \`FK_accounts_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`accounts\` DROP FOREIGN KEY \`FK_accounts_user_profile\``);
        await queryRunner.query(`ALTER TABLE \`user_profiles\` DROP FOREIGN KEY \`FK_user_profiles_branch\``);
        await queryRunner.query(`ALTER TABLE \`accounts\` DROP FOREIGN KEY \`FK_accounts_role\``);
    }
}
