import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UserProfile } from '@/user/entities/users-profile.entity';
import { Notification } from '../notification/entities/notification.entities';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(dto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      title: dto.title,
      content: dto.content,
      recipient: { id: dto.recipientId } as UserProfile,
      isRead: false,
    });

    return await this.notificationRepository.save(notification);
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
        createdAt: 'DESC',
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
}
