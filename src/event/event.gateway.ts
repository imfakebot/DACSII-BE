import { Logger } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
/**
 * @class EventGateway
 * @description
 * Quản lý các kết nối WebSocket để giao tiếp thời gian thực với client.
 * Gateway này xử lý các sự kiện kết nối, ngắt kết nối và gửi thông báo tới client.
 * Cấu hình CORS với origin '*' cho phép kết nối từ bất kỳ nguồn nào.
 */
@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
    /**
     * @description
     * Instance của server Socket.IO, được inject bởi NestJS.
     * Dùng để gửi sự kiện đến các client đã kết nối.
     */
    @WebSocketServer()
    server!: Server;

    /**
     * @description
     * Logger để ghi lại các thông tin quan trọng trong quá trình hoạt động của gateway.
     */
    private logger = new Logger(EventGateway.name);

    /**
     * @method handleConnection
     * @description
     * Được gọi khi một client mới kết nối tới server.
     * Ghi lại ID của client và thêm client vào phòng 'admin_room'.
     * @param {Socket} client - Đối tượng socket của client vừa kết nối.
     */
    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`)
        void client.join('admin_room');
    }

    /**
     * @method handleDisconnect
     * @description
     * Được gọi khi một client ngắt kết nối khỏi server.
     * Ghi lại ID của client đã ngắt kết nối.
     * @param {Socket} client - Đối tượng socket của client vừa ngắt kết nối.
     */
    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * @method notifyAdminNewBooking
     * @description
     * Gửi sự kiện 'new booking' đến tất cả các client đang kết nối (đặc biệt là admin).
     * Thông báo này chứa dữ liệu về một đơn đặt sân mới.
     * @param {any} bookingData - Dữ liệu của đơn đặt sân mới.
     */
    notifyAdminNewBooking(bookingData: any) {
        this.server.emit('new booking', bookingData);
        this.logger.log('Emitted new_booking event to Admin');
    }
}