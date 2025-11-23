import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Field } from '../fields/entities/field.entity';
import { PricingService } from '@/pricing/pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UserProfile } from '@/users/entities/users-profile.entity';
import { BookingStatus } from './enums/booking-status.enum';

@Injectable()
export class BookingService {
    constructor(
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
        @InjectRepository(Field)
        private readonly fieldRepository: Repository<Field>,
        private readonly pricingService: PricingService
    ) { }

    async create(createBookingDto: CreateBookingDto, userProfile: UserProfile): Promise<Booking> {
        // 1. TÁI SỬ DỤNG LOGIC KIỂM TRA & TÍNH GIÁ
        // Bước này cực quan trọng: Nó đảm bảo giá đúng và sân chưa bị ai cướp
        // Nếu sân đã bị đặt, hàm này sẽ ném lỗi ConflictException ngay lập tức.
        const pricingResult = await this.pricingService.checkPriceAndAvailability({
            fieldId: createBookingDto.fieldId,
            startTime: createBookingDto.startTime,
            durationMinutes: createBookingDto.durationMinutes,
        })

        // 2. Chuẩn bị dữ liệu để lưu
        // pricingResult trả về booking_details dạng chuỗi, ta cần tính lại Date object để lưu DB
        const start = new Date(createBookingDto.startTime);
        const end = new Date(start.getTime() + createBookingDto.durationMinutes * 60000);

        // 3. Tạo Booking Entity
        const newBooking = this.bookingRepository.create({
            start_time: start,
            end_time: end,
            total_price: pricingResult.pricing.total_price, // Lấy giá đã tính từ PricingService
            status: BookingStatus.PENDING, // Mặc định là chờ thanh toán/xác nhận
            bookingDate: new Date(), // Ngày thực hiện đặt đơn
            userProfile: userProfile, // Người đặt
            field: { id: createBookingDto.fieldId } as Field, // Sân bóng
        });
        // 4. Lưu vào CSDL
        return this.bookingRepository.save(newBooking);
    }
}