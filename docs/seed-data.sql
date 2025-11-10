-- Seed data cho mục đích test
-- Chạy sau khi đã tạo database (football_booking_system)
-- Lưu ý: file này dành cho môi trường phát triển / testing

SET NAMES utf8mb4;
USE football_booking_system;

-- 1) Roles
INSERT INTO roles
    (id, name)
VALUES
    (1, 'admin'),
    (2, 'user'),
    (3, 'field_owner')
ON DUPLICATE KEY
UPDATE name=VALUES
(name);

-- 2) User profiles (UUIDs cố định cho dễ test)
INSERT INTO user_profiles
    (id, full_name, date_of_birth, gender, phone_number, avatar_url, bio)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Nguyen Van Chu', '1988-05-12', 'male', '0912345678', NULL, 'Chủ sân mẫu'),
    ('22222222-2222-2222-2222-222222222222', 'Tran Thi Mai', '1995-03-08', 'female', '0987654321', NULL, 'Người dùng thử');

-- 3) Accounts
INSERT INTO accounts
    (id, email, password_hash, provider, status, is_verified, user_profile_id, role_id)
VALUES
    ('aaaaaaa1-0000-4000-8000-aaaaaaaaaaaa', 'owner@example.com', '$2b$10$ownerhashplaceholder', 'local', 'active', TRUE, '11111111-1111-1111-1111-111111111111', 3),
    ('bbbbbbb2-0000-4000-8000-bbbbbbbbbbbb', 'user@example.com', '$2b$10$userhashplaceholder', 'local', 'active', TRUE, '22222222-2222-2222-2222-222222222222', 2);

-- 4) Cities and Wards
INSERT INTO cities
    (id, name, type)
VALUES
    (1, 'Hanoi', 'Thành phố')
ON DUPLICATE KEY
UPDATE name=VALUES
(name);

INSERT INTO wards
    (id, name, type, city_id)
VALUES
    (101, 'Cầu Giấy', 'Quận', 1)
ON DUPLICATE KEY
UPDATE name=VALUES
(name);

-- 5) Addresses
INSERT INTO addresses
    (id, street, ward_id, city_id)
VALUES
    ('addr-0001-0000-0000-000000000001', 'Số 1, Đường A', 101, 1),
    ('addr-0002-0000-0000-000000000002', 'Số 12, Đường B', 101, 1)
ON DUPLICATE KEY
UPDATE street=VALUES
(street);

-- 6) Gán address_id cho user_profiles (nếu muốn)
UPDATE user_profiles SET address_id = 'addr-0001-0000-0000-000000000001' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE user_profiles SET address_id = 'addr-0002-0000-0000-000000000002' WHERE id = '22222222-2222-2222-2222-222222222222';

-- 7) Field types
INSERT INTO field_types
    (id, name, description)
VALUES
    ('ft-5x5-0000-0000-000000000001', 'Sân 5x5', 'Sân 5 người, nhỏ gọn'),
    ('ft-7x7-0000-0000-000000000002', 'Sân 7x7', 'Sân 7 người, phù hợp đội nhỏ')
ON DUPLICATE KEY
UPDATE name=VALUES
(name);

-- 8) Fields (sân bóng)
INSERT INTO fields
    (id, name, description, status, field_type_id, address_id, owner_id)
VALUES
    ('field-0001-0000-0000-000000000001', 'Sân A - Cầu Giấy', 'Sân cỏ nhân tạo, hệ thống đèn chiếu sáng', 'active', 'ft-5x5-0000-0000-000000000001', 'addr-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
    ('field-0002-0000-0000-000000000002', 'Sân B - Cầu Giấy', 'Sân cỏ tự nhiên, bãi đỗ xe thuận tiện', 'active', 'ft-7x7-0000-0000-000000000002', 'addr-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111')
ON DUPLICATE KEY
UPDATE name=VALUES
(name);

-- 9) Field images
INSERT INTO field_images
    (id, image_url, is_cover, field_id)
VALUES
    ('fimg-0001', 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1200&auto=format&fit=crop&q=60', TRUE, 'field-0001-0000-0000-000000000001'),
    ('fimg-0002', 'https://images.unsplash.com/photo-1505842465776-3d5d2f6d9d4b?w=1200&auto=format&fit=crop&q=60', TRUE, 'field-0002-0000-0000-000000000002')
ON DUPLICATE KEY
UPDATE image_url=VALUES
(image_url);

-- 10) Utilities and mapping
INSERT INTO utilities
    (id, name, icon_url)
VALUES
    (1, 'Đèn chiếu sáng', NULL),
    (2, 'Bãi đỗ xe', NULL)
ON DUPLICATE KEY
UPDATE name=VALUES
(name);

INSERT INTO field_utilities
    (field_id, utility_id)
VALUES
    ('field-0001-0000-0000-000000000001', 1),
    ('field-0002-0000-0000-000000000002', 2)
ON DUPLICATE KEY
UPDATE utility_id=VALUES
(utility_id);

-- 11) Time slots (áp dụng cho field types)
INSERT INTO time_slots
    (id, start_time, end_time, price, is_peak_hour, field_type_id)
VALUES
    (1, '07:00:00', '08:00:00', 150000.00, FALSE, 'ft-5x5-0000-0000-000000000001'),
    (2, '08:00:00', '09:00:00', 150000.00, FALSE, 'ft-5x5-0000-0000-000000000001'),
    (3, '19:00:00', '20:00:00', 200000.00, TRUE, 'ft-7x7-0000-0000-000000000002')
ON DUPLICATE KEY
UPDATE price=VALUES
(price);

-- 12) Một booking mẫu (user đặt sân)
INSERT INTO bookings
    (id, booking_date, total_price, status, user_profile_id, field_id, time_slot_id)
VALUES
    ('bk-0001-0000-0000-000000000001', '2025-11-09', 150000.00, 'confirmed', '22222222-2222-2222-2222-222222222222', 'field-0001-0000-0000-000000000001', 1)
ON DUPLICATE KEY
UPDATE status=VALUES
(status), total_price=VALUES
(total_price);

-- 13) Voucher mẫu
INSERT INTO vouchers
    (id, code, discount_amount, discount_percentage, max_discount_amount, min_order_value, valid_from, valid_to, quantity)
VALUES
    ('vch-0001-0000-0000-000000000001', 'WELCOME10', NULL, 10, 50000.00, 100000.00, '2025-01-01 00:00:00', '2026-01-01 00:00:00', 100)
ON DUPLICATE KEY
UPDATE code=VALUES
(code);

-- 14) Payment mẫu cho booking
INSERT INTO payments
    (id, amount, final_amount, status, payment_method, transaction_code, booking_id, voucher_id)
VALUES
    ('pay-0001-0000-0000-000000000001', 150000.00, 135000.00, 'completed', 'momo', 'txn-12345', 'bk-0001-0000-0000-000000000001', 'vch-0001-0000-0000-000000000001')
ON DUPLICATE KEY
UPDATE status=VALUES
(status), final_amount=VALUES
(final_amount);

-- 15) Reviews
INSERT INTO reviews
    (id, rating, comment, user_profile_id, field_id)
VALUES
    ('rv-0001-0000-0000-000000000001', 5, 'Sân đẹp, nhân viên thân thiện', '22222222-2222-2222-2222-222222222222', 'field-0001-0000-0000-000000000001')
ON DUPLICATE KEY
UPDATE comment=VALUES
(comment);

-- 16) Notifications & feedback samples
INSERT INTO notifications
    (id, title, content, is_read, recipient_id)
VALUES
    ('ntf-0001-0000-0000-000000000001', 'Booking xác nhận', 'Booking của bạn đã được xác nhận cho ngày 2025-11-09', FALSE, '22222222-2222-2222-2222-222222222222')
ON DUPLICATE KEY
UPDATE title=VALUES
(title);

INSERT INTO feedbacks
    (id, title, category, status, submitter_id)
VALUES
    ('fb-0001-0000-0000-000000000001', 'Lỗi đặt sân', 'bug', 'open', '22222222-2222-2222-2222-222222222222')
ON DUPLICATE KEY
UPDATE title=VALUES
(title);

INSERT INTO feedback_responses
    (id, content, feedback_id, responder_id)
VALUES
    ('fbr-0001-0000-0000-000000000001', 'Cảm ơn đã báo lỗi, chúng tôi sẽ kiểm tra', 'fb-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111')
ON DUPLICATE KEY
UPDATE content=VALUES
(content);

-- Kết thúc seed
SELECT 'Seed dữ liệu đã chèn (hoặc bỏ qua nếu đã tồn tại)';
