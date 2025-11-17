/**
 * @file google-oauth.config.ts
 * @description Cấu hình cho việc xác thực qua Google OAuth.
 *
 * Sử dụng `registerAs` của NestJS để tạo một không gian tên (namespace) 'googleOAuth'
 * cho các biến môi trường liên quan đến Google. Điều này giúp việc truy cập
 * các biến cấu hình trong ứng dụng trở nên có tổ chức và dễ dàng hơn.
 *
 * @requires GOOGLE_CLIENT_ID - Client ID được cung cấp bởi Google Cloud Console.
 * @requires GOOGLE_CLIENT_SECRET - Client Secret được cung cấp bởi Google Cloud Console.
 * @requires GOOGLE_CALLBACK_URL - URL callback mà Google sẽ chuyển hướng về sau khi xác thực thành công.
 */
import { registerAs } from "@nestjs/config";


export default registerAs('googleOAuth', () => {
    return {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    };
})