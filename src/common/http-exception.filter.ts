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
        let responseMessage: string | string[] = 'Internal server error';

        // 1. Xử lý các lỗi HTTP đã được định nghĩa (BadRequest, NotFound, v.v.)
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const responseBody = exception.getResponse();

            // Trích xuất message từ response body một cách an toàn
            if (typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody) {
                responseMessage = (responseBody as { message: string | string[] }).message;
            } else if (typeof responseBody === 'string') {
                responseMessage = responseBody;
            }
        }
        // 2. Xử lý các lỗi hệ thống (Error) chưa được lường trước
        else if (exception instanceof Error) {
            this.logger.error(`System Error: ${exception.message}`, exception.stack);

            // Xử lý riêng cho lỗi không tìm thấy file (ENOENT) để trả về 404
            // Đây là cách an toàn để chống path disclosure thay vì kiểm tra chuỗi.
            if ('code' in exception && exception.code === 'ENOENT') {
                status = HttpStatus.NOT_FOUND;
                responseMessage = 'File not found';
            } else {
                // Đối với tất cả các lỗi hệ thống khác, luôn trả về thông báo chung
                // để tránh rò rỉ chi tiết lỗi.
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                responseMessage = 'Internal server error';
            }
        }

        // 3. Trả về response đã được chuẩn hóa
        response.status(status).json({
            statusCode: status,
            message: responseMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}