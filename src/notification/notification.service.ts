import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm'; // Sửa path import cho gọn
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Notification } from '../notification/entities/notification.entities';
import { EventGateway } from '@/event/event.gateway'; // <--- IMPORT GATEWAY

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    // Inject EventGateway để bắn socket real-time
    private readonly eventGateway: EventGateway,
  ) { }

  async createNotification(dto: CreateNotificationDto) {
    // 1. Lưu vào Database
    const notification = this.notificationRepository.create({
      title: dto.title,
      content: dto.content,
      recipient: { id: dto.recipientId } as UserProfile,
      isRead: false,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // 2. Bắn Socket Real-time xuống cho User ngay lập tức
    // Hàm này bạn cần định nghĩa trong EventGateway (ví dụ: emit tới room userId)
    this.eventGateway.sendNotificationToUser(dto.recipientId, savedNotification);

    return savedNotification;
  }

  async findAllByUser(
    userProfileId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepository.findAndCount({
      where: {
        recipient: {
          id: userProfileId,
        },
      },
      order: {
        createdAt: 'DESC', // Mới nhất lên đầu
      },
      skip,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: {
        recipient: {
          id: userProfileId,
        },
        isRead: false,
      },
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

  async markAsRead(id: string, userProfileId: string) {
    const notification = await this.notificationRepository.findOne({
      where: {
        id,
        recipient: {
          id: userProfileId,
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại.');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userProfileId: string) {
    await this.notificationRepository.update(
      { recipient: { id: userProfileId }, isRead: false },
      { isRead: true },
    );
    return { message: 'Đã đánh dấu tất cả là đã đọc.' };
  }

  async delete(id: string, userProfileId: string) {
    const result = await this.notificationRepository.delete({
      id,
      recipient: { id: userProfileId } // Chỉ xóa được thông báo của chính mình
    });

    if (result.affected === 0) {
      throw new NotFoundException('Thông báo không tồn tại hoặc bạn không có quyền xóa.');
    }

    return { message: 'Xóa thông báo thành công.' };
  }
}