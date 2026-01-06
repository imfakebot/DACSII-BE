import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileToVoucher1767663059556 implements MigrationInterface {
    name = 'AddUserProfileToVoucher1767663059556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `vouchers` ADD `user_profile_id` varchar(36) NULL COMMENT 'ID của người dùng sở hữu voucher'");
        await queryRunner.query("ALTER TABLE `vouchers` ADD CONSTRAINT `FK_Voucher_UserProfile` FOREIGN KEY (`user_profile_id`) REFERENCES `user_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `vouchers` DROP FOREIGN KEY `FK_Voucher_UserProfile`");
        await queryRunner.query("ALTER TABLE `vouchers` DROP COLUMN `user_profile_id`");
    }

}
