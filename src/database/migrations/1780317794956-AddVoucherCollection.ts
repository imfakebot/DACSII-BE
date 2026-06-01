import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoucherCollection1780317794956 implements MigrationInterface {
    name = 'AddVoucherCollection1780317794956'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('voucher_collections');
        if (!tableExists) {
            await queryRunner.query(`CREATE TABLE \`voucher_collections\` (\`id\` varchar(36) NOT NULL, \`user_profile_id\` varchar(255) NOT NULL, \`voucher_id\` varchar(255) NOT NULL, \`collected_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_5e4c3990498f7d77ca95f67c05\` (\`user_profile_id\`, \`voucher_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        }
        
        const columnExists = await queryRunner.hasColumn('vouchers', 'is_collectible');
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE \`vouchers\` ADD \`is_collectible\` tinyint NOT NULL DEFAULT 0`);
        }

        await queryRunner.query(`ALTER TABLE \`voucher_collections\` ADD CONSTRAINT \`FK_50d62f6e47bc8f4ccec2ac5af4d\` FOREIGN KEY (\`user_profile_id\`) REFERENCES \`user_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`voucher_collections\` ADD CONSTRAINT \`FK_acbd35ecabf312f8558bb67d4a9\` FOREIGN KEY (\`voucher_id\`) REFERENCES \`vouchers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`voucher_collections\` DROP FOREIGN KEY \`FK_acbd35ecabf312f8558bb67d4a9\``);
        await queryRunner.query(`ALTER TABLE \`voucher_collections\` DROP FOREIGN KEY \`FK_50d62f6e47bc8f4ccec2ac5af4d\``);
        await queryRunner.query(`ALTER TABLE \`vouchers\` DROP COLUMN \`is_collectible\``);
        await queryRunner.query(`DROP TABLE \`voucher_collections\``);
    }

}
