import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { ShopAccessGuard } from '../common/guards/shop-access.guard';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller('api/shops/:shopId/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getCurrentSubscription(@Param('shopId') shopId: string) {
    const subscription = await this.subscriptionsService.getCurrentSubscription(shopId);
    return new SubscriptionResponseDto(subscription);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout for plan upgrade' })
  async createCheckout(@Param('shopId') shopId: string, @Body() dto: CheckoutDto) {
    const checkoutUrl = await this.subscriptionsService.createCheckout(shopId, dto.planId);
    return { url: checkoutUrl };
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@Param('shopId') shopId: string) {
    const subscription = await this.subscriptionsService.cancelSubscription(shopId);
    return new SubscriptionResponseDto(subscription);
  }
}
