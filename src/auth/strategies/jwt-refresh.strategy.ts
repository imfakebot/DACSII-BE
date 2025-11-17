import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * @interface JwtPayload
 * @description Định nghĩa cấu trúc dữ liệu (payload) được mã hóa bên trong JWT.
 * @property {string} sub - Subject của token, thường là ID của người dùng.
 * @property {string} email - Email của người dùng.
 * @property {string} role - Vai trò của người dùng.
 */
interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

/**
 * @class JwtRefreshStrategy
 * @description Triển khai chiến lược xác thực của Passport cho JWT Refresh Token.
 *
 * Chiến lược này chịu trách nhiệm trích xuất và xác thực refresh token được gửi lên từ client
 * (thường là qua cookie) để sử dụng cho việc cấp lại access token mới.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    /**
     * @constructor
     * @param configService - Service để truy cập các biến môi trường, cụ thể là `JWT_REFRESH_SECRET`.
     */
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return (request?.cookies as Record<string, string>)?.['refresh_token'];
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string
        })
    }

    /**
     * @method validate
     * @description Được Passport tự động gọi sau khi token đã được xác thực thành công (đúng chữ ký, chưa hết hạn).
     *
     * Dữ liệu trả về từ hàm này sẽ được Passport gắn vào đối tượng `request.user`.
     *
     * @param {JwtPayload} payload - Dữ liệu đã được giải mã từ refresh token.
     * @returns {JwtPayload} - Trả về chính payload để `JwtRefreshGuard` có thể truy cập.
     */
    validate(payload: JwtPayload) {
        return payload;
    }
}