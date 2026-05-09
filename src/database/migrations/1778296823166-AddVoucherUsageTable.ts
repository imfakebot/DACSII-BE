import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoucherUsageTable1778296823166 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`voucher_usages\` (
                \`id\` varchar(36) NOT NULL, 
                \`user_profile_id\` varchar(255) NOT NULL, 
                \`voucher_id\` varchar(36) NOT NULL, 
                \`used_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), 
                \`booking_id\` varchar(255) NULL, 
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`voucher_usages\` 
            ADD CONSTRAINT \`FK_voucher_usages_user_profile\` 
            FOREIGN KEY (\`user_profile_id\`) REFERENCES \`user_profiles\`(\`id\`) ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE \`voucher_usages\` 
            ADD CONSTRAINT \`FK_voucher_usages_voucher\` 
            FOREIGN KEY (\`voucher_id\`) REFERENCES \`vouchers\`(\`id\`) ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`voucher_usages\` DROP FOREIGN KEY \`FK_voucher_usages_voucher\``);
        await queryRunner.query(`ALTER TABLE \`voucher_usages\` DROP FOREIGN KEY \`FK_voucher_usages_user_profile\``);
        await queryRunner.query(`DROP TABLE \`voucher_usages\``);
    }

}
