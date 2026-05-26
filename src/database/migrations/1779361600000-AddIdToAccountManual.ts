import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdToAccountManual1779361600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Kiểm tra xem cột id đã tồn tại chưa
        const hasId = await queryRunner.hasColumn("accounts", "id");
        
        if (!hasId) {
            // Thêm cột id nullable trước
            await queryRunner.query(`ALTER TABLE \`accounts\` ADD \`id\` varchar(36) NULL`);
            // Tạo UUID cho các hàng hiện có
            await queryRunner.query(`UPDATE \`accounts\` SET \`id\` = UUID()`);
            // Chuyển thành NOT NULL
            await queryRunner.query(`ALTER TABLE \`accounts\` MODIFY \`id\` varchar(36) NOT NULL`);
            // Thêm PRIMARY KEY
            await queryRunner.query(`ALTER TABLE \`accounts\` ADD PRIMARY KEY (\`id\`)`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasId = await queryRunner.hasColumn("accounts", "id");
        if (hasId) {
            await queryRunner.query(`ALTER TABLE \`accounts\` DROP PRIMARY KEY`);
            await queryRunner.query(`ALTER TABLE \`accounts\` DROP COLUMN \`id\``);
        }
    }
}
