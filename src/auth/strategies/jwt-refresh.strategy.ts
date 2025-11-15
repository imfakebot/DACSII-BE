import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    // Thêm các thuộc tính khác nếu có trong payload
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(configService: ConfigService) {
        super({
            // Sử dụng nhiều cách trích xuất, ở đây là từ cookie
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return (request?.cookies as Record<string, string>)?.['refresh_token'];
                },
            ]),
            // Không bỏ qua việc kiểm tra token hết hạn
            ignoreExpiration: false,
            // Khóa bí mật để giải mã token, phải giống với lúc tạo token
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string
        })
    }

    /**
   * Hàm này sẽ được gọi sau khi token đã được xác thực thành công (đúng signature, chưa hết hạn).
   * @param req - Request gốc từ client
   * @param payload - Dữ liệu đã được giải mã từ token (thường chứa userId, email,...)
   * @returns Dữ liệu sẽ được gắn vào req.user
   */
    validate(payload: JwtPayload) {
        return payload;
    }
}