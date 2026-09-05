import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../integrations/email/email.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, type: NotificationType, title: string, body: string, shopId?: string, data?: any, sendEmail: boolean = false) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        shopId,
        type,
        title,
        body,
        data: data || {},
      },
      include: { user: true }
    });

    if (sendEmail) {
      await this.emailService.sendEmail({
        to: notification.user.email,
        subject: title,
        html: `<p>${body}</p>`,
      });
    }

    return notification;
  }

  async findAll(userId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    return Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
