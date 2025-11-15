import { UserProfile } from '@/users/entities/users-profile.entity';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Định nghĩa cấu trúc của đối tượng user được trả về sau khi xác thực thành công.
 * Dữ liệu này được trả về từ `LocalStrategy` và được sử dụng trong `AuthController.login`.
 */
export interface AuthenticatedUser {
    userProfile?: UserProfile;
    id: string;
    email: string;
    user_profile_id?: string;
    role: { id: string; name?: string };
    is_profile_complete?: boolean;
}

export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
        return request.user;
    },
);