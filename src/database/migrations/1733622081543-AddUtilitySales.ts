import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUtilitySales1733622081543 implements MigrationInterface {
    name = 'AddUtilitySales1733622081543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create utility_sales table
        await queryRunner.query(
            "CREATE TABLE `utility_sales` (\n                `id` varchar(36) NOT NULL,\n                `quantity` int NOT NULL,\n                `unit_price` decimal(10, 2) NOT NULL,\n                `total_price` decimal(10, 2) NOT NULL,\n                `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\n                `utility_id` int NULL,\n                `branch_id` varchar(36) NULL,\n                `booking_id` varchar(36) NULL,\n                `sold_by_id` varchar(36) NULL,\n                PRIMARY KEY (`id`)\n            ) ENGINE=InnoDB"
        );
        
        // Add columns to utilities table
        await queryRunner.query("ALTER TABLE `utilities` ADD `price` decimal(10, 2) NULL");
        await queryRunner.query("ALTER TABLE `utilities` ADD `type` enum ('amenity', 'product') NOT NULL DEFAULT 'amenity'");
        
        // Add foreign keys to utility_sales table
        await queryRunner.query(
            "ALTER TABLE `utility_sales`\n            ADD CONSTRAINT `FK_utility_sales_utility` FOREIGN KEY (`utility_id`) REFERENCES `utilities`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION"
        );
        await queryRunner.query(
            "ALTER TABLE `utility_sales`\n            ADD CONSTRAINT `FK_utility_sales_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION"
        );
        await queryRunner.query(
            "ALTER TABLE `utility_sales`\n            ADD CONSTRAINT `FK_utility_sales_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION"
        );
        await queryRunner.query(
            "ALTER TABLE `utility_sales`\n            ADD CONSTRAINT `FK_utility_sales_sold_by` FOREIGN KEY (`sold_by_id`) REFERENCES `user_profiles`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys from utility_sales
        await queryRunner.query("ALTER TABLE `utility_sales` DROP FOREIGN KEY `FK_utility_sales_sold_by`");
        await queryRunner.query("ALTER TABLE `utility_sales` DROP FOREIGN KEY `FK_utility_sales_booking`");
        await queryRunner.query("ALTER TABLE `utility_sales` DROP FOREIGN KEY `FK_utility_sales_branch`");
        await queryRunner.query("ALTER TABLE `utility_sales` DROP FOREIGN KEY `FK_utility_sales_utility`");

        // Drop columns from utilities table
        await queryRunner.query("ALTER TABLE `utilities` DROP COLUMN `type`");
        await queryRunner.query("ALTER TABLE `utilities` DROP COLUMN `price`");
        
        // Drop utility_sales table
        await queryRunner.query("DROP TABLE `utility_sales`");
    }

}
