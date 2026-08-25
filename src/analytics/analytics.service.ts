import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import * as crypto from 'crypto';
import { AnalyticsEventType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async ingestEvent(dto: IngestEventDto, ip: string, userAgent: string) {
    // Check rate limit
    const rlKey = `rate_limit:analytics:${ip}`;
    const rlCount = await this.redis.incr(rlKey);
    if (rlCount === 1) await this.redis.expire(rlKey, 60); // 1 minute
    if (rlCount > 60) return; // Silently reject

    // Compute dedupHash
    const dedupString = `${ip}-${userAgent}-${dto.shopId}-${dto.eventType}-${dto.productId || 'none'}`;
    const dedupHash = crypto.createHash('md5').update(dedupString).digest('hex');

    const dedupKey = `dedup:analytics:${dedupHash}`;
    const exists = await this.redis.get(dedupKey);
    if (exists) return; // Silently reject

    // Store event
    await this.prisma.analyticsEvent.create({
      data: {
        shopId: dto.shopId,
        productId: dto.productId,
        eventType: dto.eventType as AnalyticsEventType,
        source: dto.source,
        dedupHash,
      },
    });

    // Set dedup hash with 30 min TTL
    await this.redis.set(dedupKey, '1', 30 * 60);
  }

  async getShopAnalytics(shopId: string, dateRange: { start: Date; end: Date }) {
    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        shopId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    const stats = Object.values(AnalyticsEventType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<string, number>);

    events.forEach(e => {
      stats[e.eventType] = e._count.id;
    });

    return stats;
  }

  async getEvents(shopId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    return Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { shopId },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true } } },
      }),
      this.prisma.analyticsEvent.count({ where: { shopId } }),
    ]);
  }
}
