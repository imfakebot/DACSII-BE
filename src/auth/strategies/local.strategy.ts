import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * @class LocalStrategy
 * @description Triển khai chiến lược xác thực "local" của Passport.
 *
 * Chiến lược này xử lý việc xác thực người dùng dựa trên email và mật khẩu.
 * Nó được sử dụng cho endpoint đăng nhập chính của ứng dụng, thường được kích hoạt bởi `AuthGuard('local')`.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  /**
   * @constructor
   * @param authService - Service chứa logic để xác thực thông tin người dùng.
   */
  constructor(private authService: AuthService) {
    // Cấu hình cho Passport-local sử dụng trường 'email' thay vì 'username' mặc định.
    super({ usernameField: 'email' });
  }

  /**
   * @method validate
   * @description Được Passport tự động gọi để xác thực thông tin đăng nhập của người dùng.
   *
   * Phương thức này nhận email và mật khẩu từ request body, sau đó gọi `authService.validateUser`
   * để kiểm tra tính hợp lệ. Nếu thành công, thông tin người dùng sẽ được trả về và gắn vào `req.user`.
   *
   * @param {string} email - Email người dùng cung cấp.
   * @param {string} pass - Mật khẩu người dùng cung cấp.
   * @returns {Promise<any>} Thông tin người dùng nếu xác thực thành công.
   * @throws {UnauthorizedException} Nếu thông tin đăng nhập không chính xác.
   */
  async validate(email: string, pass: string): Promise<any> {
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác.');
    }
    return user;
  }
}
