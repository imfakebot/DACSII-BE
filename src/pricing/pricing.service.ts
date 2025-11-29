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

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(TimeSlot)
    private readonly timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Field)
    private readonly fieldRepository: Repository<Field>,
  ) {}

  /**
   * Kiểm tra tính khả dụng và tính giá cho khung giờ động.
   * @param dto Dữ liệu đầu vào (Sân, Giờ bắt đầu, Thời lượng)
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
}
