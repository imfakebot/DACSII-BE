import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request: { user?: any } = ctx.switchToHttp().getRequest();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return request.user;
    }
)