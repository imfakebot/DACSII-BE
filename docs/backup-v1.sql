-- MySQL dump - COMPATIBLE VERSION
-- Database: DACSII

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- --------------------------------------------------------
-- 1. Bảng đọc lập (Không phụ thuộc bảng khác)
-- --------------------------------------------------------

-- Bảng Roles
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'Tên vai trò (e.g., admin, user, field_owner)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ các vai trò trong hệ thống';

-- Bảng Cities
DROP TABLE IF EXISTS `cities`;
CREATE TABLE `cities` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) DEFAULT NULL COMMENT 'e.g., Tỉnh, Thành phố',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Utilities
DROP TABLE IF EXISTS `utilities`;
CREATE TABLE `utilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `icon_url` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Field Types
DROP TABLE IF EXISTS `field_types`;
CREATE TABLE `field_types` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) DEFAULT NULL COMMENT 'e.g., Sân 5 người, Sân 7 người',
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Vouchers
DROP TABLE IF EXISTS `vouchers`;
CREATE TABLE `vouchers` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `discount_percentage` int DEFAULT NULL,
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `min_order_value` decimal(10,2) DEFAULT '0.00',
  `valid_from` datetime NOT NULL,
  `valid_to` datetime NOT NULL,
  `quantity` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_vouchers_valid_to` (`valid_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Bảng phụ thuộc cấp 1
-- --------------------------------------------------------

-- Bảng Wards (Phụ thuộc Cities)
DROP TABLE IF EXISTS `wards`;
CREATE TABLE `wards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) DEFAULT NULL COMMENT 'e.g., Phường, Xã, Thị trấn',
  `city_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `wards_cities_FK` (`city_id`),
  CONSTRAINT `wards_cities_FK` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9964 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Addresses (Phụ thuộc Wards, Cities)
DROP TABLE IF EXISTS `addresses`;
CREATE TABLE `addresses` (
  `id` varchar(36) NOT NULL,
  `street` varchar(255) NOT NULL,
  `ward_id` int NOT NULL,
  `cityId` int NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `addresses_ibfk_1` (`ward_id`),
  KEY `idx_address_location` (`cityId`,`ward_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_addresses_cities` FOREIGN KEY (`cityId`) REFERENCES `cities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ địa chỉ chi tiết';

-- Bảng User Profiles (Phụ thuộc Addresses - Optional)
DROP TABLE IF EXISTS `user_profiles`;
CREATE TABLE `user_profiles` (
  `id` varchar(36) NOT NULL COMMENT 'UUID của hồ sơ người dùng',
  `full_name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `avatar_url` text,
  `bio` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_profile_complete` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone_number` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ thông tin chi tiết của người dùng';

-- Bảng Time Slots (Phụ thuộc Field Types)
DROP TABLE IF EXISTS `time_slots`;
CREATE TABLE `time_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_peak_hour` tinyint(1) NOT NULL DEFAULT '0',
  `field_type_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `start_time` (`start_time`,`end_time`,`field_type_id`),
  KEY `field_type_id` (`field_type_id`),
  CONSTRAINT `time_slots_ibfk_1` FOREIGN KEY (`field_type_id`) REFERENCES `field_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_timeslot_logic` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ các khung giờ và giá tương ứng';

-- --------------------------------------------------------
-- 3. Bảng phụ thuộc cấp 2 (Chính)
-- --------------------------------------------------------

-- Bảng Accounts (Phụ thuộc User Profiles, Roles)
DROP TABLE IF EXISTS `accounts`;
CREATE TABLE `accounts` (
  `id` varchar(36) NOT NULL COMMENT 'UUID của tài khoản',
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL COMMENT 'NULL nếu đăng nhập qua social provider',
  `provider` varchar(50) NOT NULL DEFAULT 'local' COMMENT 'e.g., local, google, facebook',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT 'e.g., active, inactive, banned',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `last_login` timestamp NULL DEFAULT NULL,
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `two_factor_secret` varchar(255) DEFAULT NULL,
  `two_factor_recovery_codes` text,
  `user_profile_id` varchar(36) NOT NULL,
  `role_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `verification_code_expires_at` datetime DEFAULT NULL,
  `verification_code` varchar(100) DEFAULT NULL,
  `hashed_refresh_token` varchar(255) DEFAULT NULL COMMENT 'Lưu refresh token đã được hash của người dùng',
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `user_profile_id` (`user_profile_id`),
  KEY `role_id` (`role_id`),
  KEY `idx_accounts_status` (`status`),
  KEY `idx_accounts_provider` (`provider`),
  CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`user_profile_id`) REFERENCES `user_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `accounts_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ thông tin đăng nhập và xác thực';

-- Bảng Fields (Phụ thuộc Field Types, Addresses, User Profiles)
DROP TABLE IF EXISTS `fields`;
CREATE TABLE `fields` (
  `id` varchar(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0: Dừng hoạt động, 1: Hoạt động, 2: Bảo trì',
  `field_type_id` varchar(36) NOT NULL,
  `address_id` varchar(36) NOT NULL,
  `owner_id` varchar(36) NOT NULL COMMENT 'Chủ sân, liên kết với user_profiles',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `idx_fields_status` (`status`),
  KEY `idx_fields_field_type_id` (`field_type_id`),
  KEY `idx_fields_address_id` (`address_id`),
  CONSTRAINT `fields_ibfk_1` FOREIGN KEY (`field_type_id`) REFERENCES `field_types` (`id`),
  CONSTRAINT `fields_ibfk_3` FOREIGN KEY (`owner_id`) REFERENCES `user_profiles` (`id`),
  CONSTRAINT `fk_fields_address_id` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ thông tin về các sân bóng';

-- Bảng Feedbacks (Phụ thuộc User Profiles)
DROP TABLE IF EXISTS `feedbacks`;
CREATE TABLE `feedbacks` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open' COMMENT 'e.g., open, in_progress, closed',
  `submitter_id` varchar(36) NOT NULL,
  `assignee_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `submitter_id` (`submitter_id`),
  KEY `idx_feedbacks_status` (`status`),
  KEY `idx_feedbacks_assignee_id` (`assignee_id`),
  CONSTRAINT `feedbacks_ibfk_1` FOREIGN KEY (`submitter_id`) REFERENCES `user_profiles` (`id`),
  CONSTRAINT `feedbacks_ibfk_2` FOREIGN KEY (`assignee_id`) REFERENCES `user_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Notifications (Phụ thuộc User Profiles)
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `recipient_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_recipient_id` (`recipient_id`),
  KEY `idx_notifications_is_read` (`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `user_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Bảng phụ thuộc cấp 3 (Chi tiết)
-- --------------------------------------------------------

-- Bảng Field Images (Phụ thuộc Fields)
DROP TABLE IF EXISTS `field_images`;
CREATE TABLE `field_images` (
  `id` varchar(36) NOT NULL,
  `image_url` text NOT NULL,
  `is_cover` tinyint(1) NOT NULL DEFAULT '0',
  `field_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_field_images_field_id` (`field_id`),
  CONSTRAINT `field_images_ibfk_1` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Field Utilities (Phụ thuộc Fields, Utilities)
DROP TABLE IF EXISTS `field_utilities`;
CREATE TABLE `field_utilities` (
  `field_id` varchar(36) NOT NULL,
  `utility_id` int NOT NULL,
  PRIMARY KEY (`field_id`,`utility_id`),
  KEY `utility_id` (`utility_id`),
  CONSTRAINT `field_utilities_ibfk_1` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `field_utilities_ibfk_2` FOREIGN KEY (`utility_id`) REFERENCES `utilities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Feedback Responses (Phụ thuộc Feedbacks, User Profiles)
DROP TABLE IF EXISTS `feedback_responses`;
CREATE TABLE `feedback_responses` (
  `id` varchar(36) NOT NULL,
  `content` text NOT NULL,
  `feedback_id` varchar(36) NOT NULL,
  `responder_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `responder_id` (`responder_id`),
  KEY `idx_feedback_responses_feedback_id` (`feedback_id`),
  CONSTRAINT `feedback_responses_ibfk_1` FOREIGN KEY (`feedback_id`) REFERENCES `feedbacks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feedback_responses_ibfk_2` FOREIGN KEY (`responder_id`) REFERENCES `user_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Bookings (Phụ thuộc User Profiles, Fields)
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` varchar(36) NOT NULL,
  `booking_date` date NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'e.g., pending, confirmed, completed, cancelled',
  `user_profile_id` varchar(36) NOT NULL,
  `field_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_user_profile_id` (`user_profile_id`),
  KEY `idx_bookings_booking_date` (`booking_date`),
  KEY `idx_booking_time` (`field_id`,`start_time`,`end_time`),
  KEY `idx_booking_field_date` (`field_id`,`booking_date`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_profile_id`) REFERENCES `user_profiles` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`),
  CONSTRAINT `chk_booking_time_logic` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Bảng phụ thuộc cấp 4 (Giao dịch & Đánh giá)
-- --------------------------------------------------------

-- Bảng Payments (Phụ thuộc Bookings, Vouchers)
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` varchar(36) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `final_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending' COMMENT 'e.g., pending, completed, failed',
  `payment_method` enum('cash','momo','vnpay','banking') NOT NULL DEFAULT 'cash',
  `transaction_code` varchar(100) DEFAULT NULL,
  `bank_code` varchar(50) DEFAULT NULL,
  `booking_id` varchar(36) NOT NULL,
  `voucher_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL COMMENT 'Thời điểm giao dịch được xác nhận thành công',
  PRIMARY KEY (`id`),
  KEY `voucher_id` (`voucher_id`),
  KEY `idx_payments_status` (`status`),
  KEY `payments_ibfk_1` (`booking_id`),
  KEY `idx_transaction_code` (`transaction_code`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Reviews (Phụ thuộc Bookings, Fields, User Profiles)
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` varchar(36) NOT NULL,
  `rating` int NOT NULL,
  `comment` text,
  `booking_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `field_id` varchar(36) NOT NULL,
  `user_profile_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_one_review_per_booking` (`booking_id`),
  KEY `fk_reviews_user` (`user_profile_id`),
  KEY `idx_reviews_field` (`field_id`),
  CONSTRAINT `fk_reviews_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_profile_id`) REFERENCES `user_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;