import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | object = 'Internal server error';

        // 1. Nếu là lỗi HTTP do mình chủ động ném ra (BadRequest, Forbidden...)
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.getResponse();
        }
        // 2. Nếu là lỗi hệ thống (như cái ENOENT bạn vừa gặp, hoặc lỗi DB)
        else if (exception instanceof Error) {
            // Log lỗi ra console server để Dev sửa (nhưng KHÔNG trả về client)
            this.logger.error(`System Error: ${exception.message}`, exception.stack);

            // Xử lý riêng cái lỗi ENOENT (File not found) cho nó thân thiện
            if ('code' in exception && exception.code === 'ENOENT') {
                status = HttpStatus.NOT_FOUND;
                message = 'File not found'; // Trả về câu này thay vì đường dẫn D:\...
            }
        }

        // Chuẩn hóa message trả về
        let responseMessage: string | string[];
        if (typeof message === 'object' && message !== null && 'message' in message) {
            responseMessage = (message as { message: string | string[] }).message;
        } else if (typeof message === 'string') {
            responseMessage = message;
        } else {
            responseMessage = 'Internal server error';
        }

        // 3. Chuẩn hóa format trả về (Luôn sạch sẽ)
        response.status(status).json({
            statusCode: status,
            message: responseMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}