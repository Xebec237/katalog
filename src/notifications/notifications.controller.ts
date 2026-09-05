import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const [data, total] = await this.notificationsService.findAll(userId, { page, limit });
    return {
      data: data.map(n => new NotificationResponseDto(n)),
      meta: { total, page, limit },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const notif = await this.notificationsService.markAsRead(userId, id);
    return new NotificationResponseDto(notif);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }
}
