import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";


@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(configService: ConfigService) {
        super({
            // Cách trích xuất token: Đọc từ body của request
            jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
            // Không bỏ qua việc kiểm tra token hết hạn
            ignoreExpiration: false,
            // Khóa bí mật để giải mã token, phải giống với lúc tạo token
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
            // Cho phép truy cập vào request gốc trong hàm validate
            passReqToCallback: true
        })
    }

    /**
   * Hàm này sẽ được gọi sau khi token đã được xác thực thành công (đúng signature, chưa hết hạn).
   * @param req - Request gốc từ client
   * @param payload - Dữ liệu đã được giải mã từ token (thường chứa userId, email,...)
   * @returns Dữ liệu sẽ được gắn vào req.user
   */
    validate(req: Request & { body: { refresh_token: string } }, payload: any): any {
        const refreshToken = req.body.refresh_token;

        return {
            ...payload,
            refreshToken
        }

    }
}