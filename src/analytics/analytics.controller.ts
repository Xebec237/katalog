import { Controller, Post, Get, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { Public } from '../common/decorators/public.decorator';
import { ShopAccessGuard } from '../common/guards/shop-access.guard';
import { Request } from 'express';

@ApiTags('Analytics')
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('api/public/analytics/events')
  @ApiOperation({ summary: 'Ingest analytics event' })
  async ingestEvent(@Body() dto: IngestEventDto, @Req() req: Request) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await this.analyticsService.ingestEvent(dto, ip, userAgent);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(ShopAccessGuard)
  @Get('api/shops/:shopId/analytics')
  @ApiOperation({ summary: 'Get shop analytics stats' })
  async getShopAnalytics(
    @Param('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.analyticsService.getShopAnalytics(shopId, { start, end });
  }

  @ApiBearerAuth()
  @UseGuards(ShopAccessGuard)
  @Get('api/shops/:shopId/analytics/events')
  @ApiOperation({ summary: 'Get raw events' })
  async getEvents(
    @Param('shopId') shopId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const [data, total] = await this.analyticsService.getEvents(shopId, { page, limit });
    return {
      data,
      meta: { total, page, limit },
    };
  }
}
