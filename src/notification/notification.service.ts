import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Notification } from '../notification/entities/notification.entities';
import { EventGateway } from '@/event/event.gateway';

/**
 * @class NotificationService
 * @description Service xử lý logic nghiệp vụ cho hệ thống thông báo.
 */
@Injectable()
export class NotificationService {
  /**
   * @constructor
   * @param {Repository<Notification>} notificationRepository - Repository cho thực thể Notification.
   * @param {EventGateway} eventGateway - Gateway để gửi sự kiện real-time.
   */
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly eventGateway: EventGateway,
  ) {}

  /**
   * @method createNotification
   * @description Tạo một thông báo mới, lưu vào CSDL và gửi sự kiện real-time đến người nhận.
   * @param {CreateNotificationDto} dto - DTO chứa thông tin để tạo thông báo.
   * @returns {Promise<Notification>} - Thông báo vừa được tạo.
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      title: dto.title,
      content: dto.content,
      recipient: { id: dto.recipientId } as UserProfile,
      isRead: false,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    this.eventGateway.sendNotificationToUser(dto.recipientId, savedNotification);

    return savedNotification;
  }

  /**
   * @method findAllByUser
   * @description Lấy danh sách thông báo của một người dùng cụ thể, có phân trang.
   * @param {string} userProfileId - ID hồ sơ người dùng.
   * @param {number} page - Số trang.
   * @param {number} limit - Số lượng trên mỗi trang.
   * @returns {Promise<object>} - Dữ liệu thông báo và thông tin meta (phân trang, số lượng chưa đọc).
   */
  async findAllByUser(userProfileId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepository.findAndCount({
      where: { recipient: { id: userProfileId } },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { recipient: { id: userProfileId }, isRead: false },
    });

    return {
      data,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * @method markAsRead
   * @description Đánh dấu một thông báo cụ thể là đã đọc.
   * @param {string} id - ID của thông báo.
   * @param {string} userProfileId - ID của người dùng để xác thực quyền sở hữu.
   * @returns {Promise<Notification>} - Thông báo đã được cập nhật.
   * @throws {NotFoundException} Nếu không tìm thấy thông báo.
   */
  async markAsRead(id: string, userProfileId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipient: { id: userProfileId } },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại.');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  /**
   * @method markAllAsRead
   * @description Đánh dấu tất cả thông báo chưa đọc của một người dùng là đã đọc.
   * @param {string} userProfileId - ID của hồ sơ người dùng.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận.
   */
  async markAllAsRead(userProfileId: string): Promise<{ message: string }> {
    await this.notificationRepository.update(
      { recipient: { id: userProfileId }, isRead: false },
      { isRead: true },
    );
    return { message: 'Đã đánh dấu tất cả là đã đọc.' };
  }

  /**
   * @method delete
   * @description Xóa một thông báo.
   * @param {string} id - ID của thông báo cần xóa.
   * @param {string} userProfileId - ID của người dùng để xác thực quyền sở hữu.
   * @returns {Promise<{ message: string }>} - Thông báo xác nhận xóa.
   * @throws {NotFoundException} Nếu không tìm thấy thông báo hoặc không có quyền xóa.
   */
  async delete(id: string, userProfileId: string): Promise<{ message: string }> {
    const result = await this.notificationRepository.delete({
      id,
      recipient: { id: userProfileId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Thông báo không tồn tại hoặc bạn không có quyền xóa.');
    }

    return { message: 'Xóa thông báo thành công.' };
  }
}
