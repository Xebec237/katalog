import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentService } from '@/integrations/payment/payment.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async getCurrentSubscription(shopId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { shopId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) return sub;

    // Return FREE plan if none active
    const freePlan = await this.prisma.plan.findUnique({ where: { slug: 'free' } });
    if (!freePlan) throw new NotFoundException('Free plan not found');
    
    return { plan: freePlan, status: 'FREE', currentPeriodEnd: null };
  }

  async createCheckout(shopId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId, active: true } });
    if (!plan) throw new NotFoundException('Plan not found');

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } });
    if (!shop) throw new NotFoundException('Shop not found');

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const checkoutUrl = await this.paymentService.createCheckoutSession({
      shopId,
      planId,
      amount: Number(plan.priceMonthly),
      currency: plan.currency,
      customerEmail: (shop as any).owner?.email || '',
      returnUrl: `${appUrl}/subscription/success`,
      cancelUrl: `${appUrl}/subscription/cancel`,
    });

    return checkoutUrl;
  }

  async activateSubscription(shopId: string, planId: string, providerSubscriptionId: string) {
    return this.prisma.subscription.create({
      data: {
        shopId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }

  async cancelSubscription(shopId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { shopId, status: SubscriptionStatus.ACTIVE },
    });
    if (!sub) throw new BadRequestException('No active subscription found');

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        canceledAt: new Date(),
        status: SubscriptionStatus.CANCELED,
      },
      include: { plan: true }
    });
  }
}
