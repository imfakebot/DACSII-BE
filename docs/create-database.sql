-- =================================================================
-- KỊCH BẢN TẠO CƠ SỞ DỮ LIỆU CHO HỆ THỐNG ĐẶT SÂN BÓNG
-- Database: MySQL
-- =================================================================

-- Cấu hình chung
SET NAMES utf8mb4;
SET time_zone
= '+07:00';

-- Tạo cơ sở dữ liệu nếu chưa tồn tại
CREATE DATABASE
IF NOT EXISTS football_booking_system CHARACTER
SET utf8mb4
COLLATE utf8mb4_unicode_ci;
USE football_booking_system;

-- ========================================
-- KHỐI 1: QUẢN LÝ USER & PHÂN QUYỀN
-- ========================================

-- Bảng: Vai trò (Roles)
CREATE TABLE roles
(
    id INT
    AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR
    (50) NOT NULL UNIQUE COMMENT 'Tên vai trò (e.g., admin, user, field_owner)'
) COMMENT 'Lưu trữ các vai trò trong hệ thống';

    -- Bảng: Hồ sơ người dùng (UserProfiles)
    CREATE TABLE user_profiles (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID của hồ sơ người dùng',
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,
    gender ENUM('male', 'female', 'other') NULL,
    phone_number VARCHAR
    (15) UNIQUE,
    avatar_url TEXT NULL,
    bio TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
    UPDATE CURRENT_TIMESTAMP
    ) COMMENT 'Lưu trữ thông tin chi tiết của người dùng';

    -- Bảng: Tài khoản (Accounts)
    CREATE TABLE accounts
    (
        id VARCHAR(36) PRIMARY KEY COMMENT 'UUID của tài khoản',
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL
        COMMENT 'NULL nếu đăng nhập qua social provider',
    provider VARCHAR
        (50) NOT NULL DEFAULT 'local' COMMENT 'e.g., local, google, facebook',
    status VARCHAR
        (20) NOT NULL DEFAULT 'active' COMMENT 'e.g., active, inactive, banned',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_code VARCHAR
        (255) NULL,
    verification_code_expires_at DATETIME NULL,
    last_login TIMESTAMP NULL,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR
        (255) NULL,
    two_factor_recovery_codes TEXT NULL,
    user_profile_id VARCHAR
        (36) NOT NULL UNIQUE,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
        UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY
        (user_profile_id) REFERENCES user_profiles
        (id) ON
        DELETE CASCADE,
    FOREIGN KEY (role_id)
        REFERENCES roles
        (id),

    -- Tối ưu hóa: Đánh chỉ mục cho các cột thường xuyên truy vấn
    INDEX idx_accounts_status
        (status),
    INDEX idx_accounts_provider
        (provider)
) COMMENT 'Lưu trữ thông tin đăng nhập và xác thực';


        -- ========================================
        -- KHỐI 2: QUẢN LÝ SÂN BÓNG & VỊ TRÍ
        -- ========================================

        -- Bảng: Tỉnh/Thành phố trực thuộc Trung ương (Cities)
        CREATE TABLE cities
        (
            id INT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL
            COMMENT 'e.g., Tỉnh, Thành phố'
);

            -- Bảng: Phường/Xã/Thị trấn (Wards)
            CREATE TABLE wards
            (
                id INT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50) NOT NULL
                COMMENT 'e.g., Phường, Xã, Thị trấn',
    city_id INT NOT NULL,
    FOREIGN KEY
                (city_id) REFERENCES cities
                (id)
);

                -- Bảng: Địa chỉ (Addresses)
                CREATE TABLE addresses
                (
                    id VARCHAR(36) PRIMARY KEY,
                    street VARCHAR(255) NOT NULL,
                    ward_id INT NOT NULL,
                    city_id INT NOT NULL,

                    FOREIGN KEY (ward_id) REFERENCES wards(id),
                    FOREIGN KEY (city_id) REFERENCES cities(id)
                )
                COMMENT 'Lưu trữ địa chỉ chi tiết';

                -- Thêm cột address_id vào user_profiles sau khi bảng addresses được tạo
                ALTER TABLE user_profiles ADD COLUMN address_id VARCHAR
                (36) NULL;
                ALTER TABLE user_profiles ADD FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;

                -- Bảng: Loại sân (FieldTypes)
                CREATE TABLE field_types
                (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g., Sân 5 người, Sân 7 người',
                    description TEXT NULL
                );

                -- Bảng: Sân bóng (Fields)
                CREATE TABLE fields
                (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    description TEXT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'active'
                    COMMENT 'e.g., active, inactive, under_maintenance',
    field_type_id VARCHAR
                    (36) NOT NULL,
    address_id VARCHAR
                    (36) NOT NULL UNIQUE,
    owner_id VARCHAR
                    (36) NOT NULL COMMENT 'Chủ sân, liên kết với user_profiles',
    
    FOREIGN KEY
                    (field_type_id) REFERENCES field_types
                    (id),
    FOREIGN KEY
                    (address_id) REFERENCES addresses
                    (id),
    FOREIGN KEY
                    (owner_id) REFERENCES user_profiles
                    (id),
    
    -- Tối ưu hóa: Đánh chỉ mục cho các cột thường xuyên truy vấn
    INDEX idx_fields_status
                    (status),
    INDEX idx_fields_field_type_id
                    (field_type_id)
) COMMENT 'Lưu trữ thông tin về các sân bóng';

                    -- Bảng: Hình ảnh sân bóng (FieldImages)
                    CREATE TABLE field_images
                    (
                        id VARCHAR(36) PRIMARY KEY,
                        image_url TEXT NOT NULL,
                        is_cover BOOLEAN NOT NULL DEFAULT FALSE,
                        field_id VARCHAR(36) NOT NULL,

                        FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
                        INDEX idx_field_images_field_id (field_id)
                    );

                    -- Bảng: Tiện ích (Utilities)
                    CREATE TABLE utilities
                    (
                        id INT
                        AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR
                        (100) NOT NULL UNIQUE,
    icon_url TEXT NULL
);

                        -- Bảng nối: Sân bóng - Tiện ích (Field_Utilities)
                        CREATE TABLE field_utilities
                        (
                            field_id VARCHAR(36) NOT NULL,
                            utility_id INT NOT NULL,

                            PRIMARY KEY (field_id, utility_id),
                            FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
                            FOREIGN KEY (utility_id) REFERENCES utilities(id) ON DELETE CASCADE
                        );


                        -- ========================================
                        -- KHỐI 3: QUẢN LÝ ĐẶT SÂN & GIÁ CẢ
                        -- ========================================

                        -- Bảng: Khung giờ (TimeSlots)
                        CREATE TABLE time_slots
                        (
                            id INT
                            AUTO_INCREMENT PRIMARY KEY,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price DECIMAL
                            (10, 2) NOT NULL,
    is_peak_hour BOOLEAN NOT NULL DEFAULT FALSE,
    field_type_id VARCHAR
                            (36) NOT NULL,
    
    FOREIGN KEY
                            (field_type_id) REFERENCES field_types
                            (id) ON
                            DELETE CASCADE,
    UNIQUE (start_time, end_time, field_type_id)
                            ) COMMENT 'Lưu trữ các khung giờ và giá tương ứng';

                            -- Bảng: Lịch đặt sân (Bookings)
                            CREATE TABLE bookings
                            (
                                id VARCHAR(36) PRIMARY KEY,
                                booking_date DATE NOT NULL,
                                total_price DECIMAL(10, 2) NOT NULL,
                                status VARCHAR(20) NOT NULL DEFAULT 'pending'
                                COMMENT 'e.g., pending, confirmed, completed, cancelled',
    user_profile_id VARCHAR
                                (36) NOT NULL,
    field_id VARCHAR
                                (36) NOT NULL,
    time_slot_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
                                UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY
                                (user_profile_id) REFERENCES user_profiles
                                (id),
    FOREIGN KEY
                                (field_id) REFERENCES fields
                                (id),
    FOREIGN KEY
                                (time_slot_id) REFERENCES time_slots
                                (id),
    
    -- Tối ưu hóa: Đảm bảo không có lịch trùng lặp
    UNIQUE
                                (field_id, booking_date, time_slot_id),
    
    -- Tối ưu hóa: Đánh chỉ mục cho các cột thường xuyên truy vấn
    INDEX idx_bookings_status
                                (status),
    INDEX idx_bookings_user_profile_id
                                (user_profile_id),
    INDEX idx_bookings_booking_date
                                (booking_date)
);


                                -- ========================================
                                -- KHỐI 4: QUẢN LÝ THANH TOÁN & KHUYẾN MÃI
                                -- ========================================

                                -- Bảng: Mã giảm giá (Vouchers)
                                CREATE TABLE vouchers
                                (
                                    id VARCHAR(36) PRIMARY KEY,
                                    code VARCHAR(50) NOT NULL UNIQUE,
                                    discount_amount DECIMAL(10, 2) NULL,
                                    discount_percentage INT NULL,
                                    max_discount_amount DECIMAL(10, 2) NULL,
                                    min_order_value DECIMAL(10, 2) DEFAULT 0,
                                    valid_from DATETIME NOT NULL,
                                    valid_to DATETIME NOT NULL,
                                    quantity INT NOT NULL,

                                    -- Tối ưu hóa: Đánh chỉ mục cho ngày hết hạn
                                    INDEX idx_vouchers_valid_to (valid_to)
                                );

                                -- Bảng: Thanh toán (Payments)
                                CREATE TABLE payments
                                (
                                    id VARCHAR(36) PRIMARY KEY,
                                    amount DECIMAL(10, 2) NOT NULL,
                                    final_amount DECIMAL(10, 2) NOT NULL,
                                    status VARCHAR(20) NOT NULL DEFAULT 'pending'
                                    COMMENT 'e.g., pending, completed, failed',
    payment_method VARCHAR
                                    (50) NOT NULL COMMENT 'e.g., cash, momo, vnpay',
    transaction_code VARCHAR
                                    (100) NULL,
    booking_id VARCHAR
                                    (36) NOT NULL UNIQUE,
    voucher_id VARCHAR
                                    (36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY
                                    (booking_id) REFERENCES bookings
                                    (id),
    FOREIGN KEY
                                    (voucher_id) REFERENCES vouchers
                                    (id),
    
    -- Tối ưu hóa: Đánh chỉ mục cho trạng thái thanh toán
    INDEX idx_payments_status
                                    (status)
);


                                    -- ========================================
                                    -- KHỐI 5: HỖ TRỢ & PHẢN HỒI
                                    -- ========================================

                                    -- Bảng: Đánh giá (Reviews)
                                    CREATE TABLE reviews
                                    (
                                        id VARCHAR(36) PRIMARY KEY,
                                        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                                        comment TEXT NULL,
                                        user_profile_id VARCHAR(36) NOT NULL,
                                        field_id VARCHAR(36) NOT NULL,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                        FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id),
                                        FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,

                                        -- Tối ưu hóa: Một người dùng chỉ đánh giá 1 sân 1 lần
                                        UNIQUE (user_profile_id, field_id)
                                    );

                                    -- Bảng: Thông báo (Notifications)
                                    CREATE TABLE notifications
                                    (
                                        id VARCHAR(36) PRIMARY KEY,
                                        title VARCHAR(255) NOT NULL,
                                        content TEXT NOT NULL,
                                        is_read BOOLEAN NOT NULL DEFAULT FALSE,
                                        recipient_id VARCHAR(36) NOT NULL,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                        FOREIGN KEY (recipient_id) REFERENCES user_profiles(id) ON DELETE CASCADE,

                                        -- Tối ưu hóa: Đánh chỉ mục để lấy thông báo cho người dùng cụ thể
                                        INDEX idx_notifications_recipient_id (recipient_id),
                                        INDEX idx_notifications_is_read (is_read)
                                    );

                                    -- Bảng: Phản hồi/Hỗ trợ (Feedbacks)
                                    CREATE TABLE feedbacks
                                    (
                                        id VARCHAR(36) PRIMARY KEY,
                                        title VARCHAR(255) NOT NULL,
                                        category VARCHAR(50) NOT NULL,
                                        status VARCHAR(20) NOT NULL DEFAULT 'open'
                                        COMMENT 'e.g., open, in_progress, closed',
    submitter_id VARCHAR
                                        (36) NOT NULL,
    assignee_id VARCHAR
                                        (36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY
                                        (submitter_id) REFERENCES user_profiles
                                        (id),
    FOREIGN KEY
                                        (assignee_id) REFERENCES user_profiles
                                        (id),
    
    -- Tối ưu hóa: Đánh chỉ mục cho trạng thái và người được giao
    INDEX idx_feedbacks_status
                                        (status),
    INDEX idx_feedbacks_assignee_id
                                        (assignee_id)
);

                                        -- Bảng: Phản hồi chi tiết (FeedbackResponses)
                                        CREATE TABLE feedback_responses
                                        (
                                            id VARCHAR(36) PRIMARY KEY,
                                            content TEXT NOT NULL,
                                            feedback_id VARCHAR(36) NOT NULL,
                                            responder_id VARCHAR(36) NOT NULL,
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                                            FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
                                            FOREIGN KEY (responder_id) REFERENCES user_profiles(id),

                                            INDEX idx_feedback_responses_feedback_id (feedback_id)
                                        );

-- =================================================================
-- KẾT THÚC SCRIPT
-- =================================================================
