import { registerAs } from '@nestjs/config';

/**
 * @file vnpay.config.ts
 * @description Cấu hình cho việc tích hợp cổng thanh toán VNPAY.
 *
 * Sử dụng `registerAs` của NestJS để tạo một không gian tên (namespace) 'vnpay'
 * cho các biến môi trường liên quan đến VNPAY.
 *
 * @requires VNP_TMN_CODE - Mã website (Terminal ID) do VNPAY cung cấp.
 * @requires VNP_HASH_SECRET - Chuỗi bí mật để tạo chữ ký (Hash Secret) do VNPAY cung cấp.
 * @requires VNP_URL - URL cổng thanh toán của VNPAY.
 * @requires VNP_RETURN_URL - URL mà VNPAY sẽ trả về sau khi người dùng hoàn tất thanh toán.
 */
export default registerAs('vnpay', () => ({
  tmnCode: process.env.VNP_TMN_CODE,
  secretKey: process.env.VNP_HASH_SECRET,
  url: process.env.VNP_URL,
  returnUrl: process.env.VNP_RETURN_URL,
  ipnUrl: process.env.VNP_IPN_URL,
}));
