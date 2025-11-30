import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeSlot } from './entities/time-slot.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Field } from '../field/entities/field.entity';
import { CheckPriceDto } from './dto/check-price.dto';
import { BookingStatus } from '../booking/enums/booking-status.enum';
import moment from 'moment-timezone';

/**
 * @class PricingService
 * @description Dịch vụ này chịu trách nhiệm xử lý tất cả logic liên quan đến việc tính giá và kiểm tra tính khả dụng của sân bóng.
 * Nó bao gồm việc xác định giá dựa trên khung giờ, kiểm tra xem sân có bị trùng lịch không, và xác thực giờ hoạt động.
 */
@Injectable()
export class PricingService {
  private readonly OPEN_HOUR = process.env.OPEN_HOUR;
  private readonly CLOSE_HOUR = process.env.CLOSE_HOUR;

  constructor(
    /**
     * @constructor
     * @param {Repository<TimeSlot>} timeSlotRepository - Repository để truy vấn các khung giờ và giá tương ứng.
     * @param {Repository<Booking>} bookingRepository - Repository để kiểm tra các lịch đặt sân đã tồn tại.
     * @param {Repository<Field>} fieldRepository - Repository để truy vấn thông tin chi tiết về sân bóng.
     */
    @InjectRepository(TimeSlot)
    private readonly timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
  ) { }

  /**
   * Kiểm tra tính khả dụng của sân và tính toán giá tiền cho một yêu cầu đặt sân cụ thể.
   *
   * Luồng xử lý chính:
   * 1. Xác thực thời gian yêu cầu có nằm trong giờ hoạt động của sân không.
   * 2. Kiểm tra sự tồn tại và trạng thái hoạt động của sân bóng.
   * 3. Kiểm tra xem có lịch đặt nào khác bị trùng (overlap) trong khoảng thời gian yêu cầu không.
   * 4. Tra cứu bảng giá `time_slots` dựa trên loại sân và thời gian bắt đầu để xác định giá mỗi giờ.
   * 5. Tính toán tổng chi phí dựa trên giá mỗi giờ và thời lượng đặt.
   *
   * @param {CheckPriceDto} dto - DTO chứa ID sân, thời gian bắt đầu và thời lượng.
   * @returns {Promise<object>} Một đối tượng chứa thông tin về tính khả dụng, chi tiết đặt sân và giá tiền.
   * @throws {BadRequestException} Nếu thời gian đặt nằm ngoài giờ hoạt động hoặc sân không hoạt động.
   * @throws {NotFoundException} Nếu không tìm thấy sân bóng.
   * @throws {ConflictException} Nếu khung giờ đã được người khác đặt.
   */
  async checkPriceAndAvailability(dto: CheckPriceDto) {
    const { fieldId, startTime, durationMinutes } = dto;

    // 1. Tính toán thời gian Bắt đầu và Kết thúc
    const start = new Date(startTime);
    // Kiểm tra ngày quá khứ
    if (start < new Date()) {
      throw new BadRequestException('Không thể đặt sân trong quá khứ.');
    }

    const end = new Date(start.getTime() + durationMinutes * 60000);

    this.validateOperatingHour(start, end);

    // 2. Kiểm tra Sân bóng có tồn tại và đang hoạt động không
    const field = await this.fieldRepository.findOne({
      where: { id: fieldId },
      relations: ['fieldType'], // Cần lấy loại sân để tra giá
    });

    if (!field) {
      throw new NotFoundException(`Sân bóng với ID ${fieldId} không tồn tại.`);
    }
    if (!field.status) {
      throw new BadRequestException('Sân bóng này đang tạm ngưng hoạt động.');
    }

    // 3. LOGIC KIỂM TRA TRÙNG GIỜ (Overlap Check)
    // Query tìm xem có bất kỳ booking nào đã tồn tại mà khoảng thời gian bị đè lên nhau không.
    // Công thức: (StartA < EndB) AND (EndA > StartB)
    const conflictingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.field_id = :fieldId', { fieldId })
      .andWhere('booking.status != :cancelledStatus', {
        cancelledStatus: BookingStatus.CANCELLED,
      })
      .andWhere('booking.start_time < :requestEnd', { requestEnd: end })
      .andWhere('booking.end_time > :requestStart', { requestStart: start })
      .getOne();

    if (conflictingBooking) {
      throw new ConflictException(
        `Khung giờ bạn chọn (${start.toLocaleTimeString('vi-VN')} - ${end.toLocaleTimeString('vi-VN')}) đã bị trùng với một lịch đặt khác.`,
      );
    }

    // 4. TÍNH TOÁN GIÁ TIỀN (Pricing Lookup)
    // Lấy giờ:phút:giây từ startTime để so sánh với bảng time_slots
    // Ví dụ: startTime là '2023-11-20T17:15:00' -> lấy '17:15:00'
    const timeString = start.toTimeString().split(' ')[0];

    // Tìm TimeSlot phù hợp với loại sân và khung giờ bắt đầu
    // Logic: Tìm slot mà start_time <= giờ khách chọn <= end_time
    const pricingRule = await this.timeSlotRepository
      .createQueryBuilder('slot')
      .where('slot.field_type_id = :fieldTypeId', {
        fieldTypeId: field.fieldType.id,
      })
      .andWhere('slot.start_time <= :time', { time: timeString })
      .andWhere('slot.end_time > :time', { time: timeString }) // Dùng > thay vì >= để tránh edge case đúng giờ giao
      .getOne();

    // Nếu không tìm thấy khung giá (ví dụ 2h sáng), dùng giá mặc định hoặc báo lỗi
    // Ở đây giả sử giá mặc định là 100.000 VNĐ/giờ nếu không cấu hình
    const pricePerHour = pricingRule ? Number(pricingRule.price) : 100000;

    // Tính tổng tiền: (Giá 1 giờ / 60 phút) * số phút đá
    const finalPrice = (pricePerHour / 60) * durationMinutes;

    // Làm tròn tiền (ví dụ làm tròn đến hàng nghìn)
    const roundedPrice = Math.ceil(finalPrice / 1000) * 1000;

    return {
      available: true,
      field_name: field.name,
      booking_details: {
        date: start.toLocaleDateString('vi-VN'),
        start_time: start.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        end_time: end.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        duration: `${durationMinutes} phút`,
      },
      pricing: {
        price_per_hour: pricePerHour,
        total_price: roundedPrice,
        currency: 'VND',
      },
      message: 'Sân còn trống, có thể đặt ngay.',
    };
  }

  /**
   * @private
   * @method validateOperatingHour
   * @description Xác thực xem khoảng thời gian (bắt đầu, kết thúc) có nằm trong giờ hoạt động cho phép của sân bóng không.
   * @param {Date} start - Thời gian bắt đầu dự kiến.
   * @param {Date} end - Thời gian kết thúc dự kiến.
   * @throws {BadRequestException} Nếu thời gian bắt đầu hoặc kết thúc nằm ngoài giờ hoạt động.
   */
  private validateOperatingHour(start: Date, end: Date) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const startHCM = moment(start).tz('Asia/Ho_Chi_Minh');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const endHCM = moment(end).tz('Asia/Ho_Chi_Minh');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const startH = Number(startHCM.hour());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const endH = Number(endHCM.hour());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const endM = Number(endHCM.minute());

    // 1. Check giờ bắt đầu: Phải từ 7h trở đi và trước 21h
    if (startH < Number(this.OPEN_HOUR) || startH > Number(this.CLOSE_HOUR)) {
      throw new BadRequestException(`Sân chỉ hoạt động từ ${this.OPEN_HOUR}h đến ${this.CLOSE_HOUR}h.`)
    }

    // 2. Check giờ kết thúc: Không được vượt quá 23:00
    if (endH > Number(this.CLOSE_HOUR) || (endH === Number(this.CLOSE_HOUR) && endM > 0)) {
      throw new BadRequestException(`Sân đóng cửa lúc ${this.CLOSE_HOUR}h. Vui lòng chọn giờ kết thúc sớm hơn.`);
    }
  }
}
