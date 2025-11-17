import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * @interface JwtPayload
 * @description Định nghĩa cấu trúc dữ liệu (payload) được mã hóa bên trong một JWT Access Token.
 * @property {string} email - Email của người dùng.
 * @property {string} sub - Subject của token, thường là ID của người dùng (Account ID).
 */
interface JwtPayload {
  email: string;
  sub: string;
}

/**
 * @class JwtStrategy
 * @description Triển khai chiến lược xác thực của Passport cho JWT Access Token.
 *
 * Chiến lược này chịu trách nhiệm:
 * 1. Trích xuất JWT từ header `Authorization` của request theo dạng Bearer Token.
 * 2. Xác thực chữ ký và thời gian hết hạn của token bằng `secretOrKey`.
 * 3. Nếu token hợp lệ, phương thức `validate` sẽ được gọi với payload đã được giải mã.
 * 4. Dữ liệu trả về từ `validate` sẽ được NestJS tự động gắn vào đối tượng `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * @constructor
   * @param configService - Service để truy cập các biến môi trường, cụ thể là `JWT_ACCESS_SECRET`.
   */
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    // Kiểm tra ngay khi khởi tạo để đảm bảo biến môi trường cần thiết đã được cung cấp.
    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not defined in environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * @method validate
   * @description Được Passport tự động gọi sau khi token đã được xác thực thành công (đúng chữ ký, chưa hết hạn).
   *
   * @param {JwtPayload} payload - Dữ liệu đã được giải mã từ access token.
   * @returns {object} Một đối tượng chứa thông tin người dùng sẽ được gắn vào `request.user`.
   */
  validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      email: payload.email,
    };
  }
}
