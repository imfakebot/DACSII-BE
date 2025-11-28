import { VnpayReturnDto } from './vnpay-return.dto';

/**
 * @class VnpayIpnDto
 * @description Data Transfer Object (DTO) để nhận và xác thực dữ liệu từ VNPAY Instant Payment Notification (IPN).
 * Lớp này kế thừa tất cả các thuộc tính từ `VnpayReturnDto` vì VNPAY gửi các tham số tương tự cho cả hai URL (Return và IPN).
 * Nó được sử dụng để NestJS và class-validator có thể nhận diện và xác thực các query parameters từ request của VNPAY.
 */
export class VnpayIpnDto extends VnpayReturnDto {}
