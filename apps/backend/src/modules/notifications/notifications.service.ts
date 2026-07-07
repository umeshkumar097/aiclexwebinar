import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { JOB_NAMES, QUEUE_NAMES } from '@zonvo/constants';

import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async queue(
    type: 'email' | 'whatsapp' | 'in_app',
    to: string,
    templateKey: string,
    variables: Record<string, string>,
    options?: {
      userId?: string;
      orgId?: string;
      scheduledAt?: Date;
      priority?: number;
    },
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: options?.userId ?? null,
      orgId: options?.orgId ?? null,
      toAddress: to,
      type: type as NotificationType,
      templateKey,
      variables,
      status: NotificationStatus.PENDING,
      scheduledAt: options?.scheduledAt ?? null,
    });

    const saved = await this.notificationRepository.save(notification);

    const jobName =
      type === 'email'
        ? JOB_NAMES.SEND_EMAIL
        : type === 'whatsapp'
          ? JOB_NAMES.SEND_WHATSAPP
          : JOB_NAMES.SEND_IN_APP;

    const delay = options?.scheduledAt
      ? Math.max(0, options.scheduledAt.getTime() - Date.now())
      : 0;

    await this.notificationsQueue.add(
      jobName,
      { notificationId: saved.id, to, templateKey, variables, type },
      {
        delay,
        priority: options?.priority ?? 0,
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 100 },
      },
    );

    await this.notificationRepository.update(saved.id, {
      status: NotificationStatus.QUEUED,
    });

    return saved;
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date(), status: NotificationStatus.READ })
      .where('id = :id AND userId = :userId AND readAt IS NULL', { id, userId })
      .execute();
  }

  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId, type: NotificationType.IN_APP },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, type: NotificationType.IN_APP, readAt: undefined as never },
    });

    return { items, total, unreadCount };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date(), status: NotificationStatus.READ })
      .where('userId = :userId AND readAt IS NULL', { userId })
      .execute();
  }
}
