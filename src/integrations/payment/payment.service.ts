import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '@/common/constants/injection-tokens';
import { PaymentProviderInterface, CreateCheckoutInput, WebhookEvent } from './interfaces/payment-provider.interface';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentProvider, PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly paymentProviders: PaymentProviderInterface | PaymentProviderInterface[],
    private readonly prisma: PrismaService,
  ) {}

  private getProvider(name?: string): PaymentProviderInterface {
    if (Array.isArray(this.paymentProviders)) {
      const provider = this.paymentProviders.find(p => p.providerName.toLowerCase() === (name || '').toLowerCase());
      if (provider) return provider;
      return this.paymentProviders[0];
    }
    return this.paymentProviders;
  }

  private mapProviderEnum(name: string): PaymentProvider {
    const upper = name.toUpperCase();
    if (upper === 'STRIPE') return PaymentProvider.STRIPE;
    if (upper === 'NOTCHPAY') return PaymentProvider.NOTCHPAY;
    if (upper === 'PAWAPAY') return PaymentProvider.PAWAPAY;
    return PaymentProvider.CINETPAY;
  }

  async createCheckoutSession(params: {
    shopId: string;
    planId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    returnUrl: string;
    cancelUrl: string;
    webhookUrl?: string;
  }) {
    const input: CreateCheckoutInput = {
      amount: params.amount,
      currency: params.currency,
      customerEmail: params.customerEmail,
      description: `Subscription for plan ${params.planId}`,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      webhookUrl: params.webhookUrl || '',
      idempotencyKey: `sub_${params.shopId}_${params.planId}_${Date.now()}`,
      metadata: {
        shopId: params.shopId,
        planId: params.planId,
      },
    };

    return this.createPayment('cinetpay', params.shopId, input);
  }

  async createPayment(providerName: string, shopId: string, input: CreateCheckoutInput) {
    const provider = this.getProvider(providerName);
    const providerEnum = this.mapProviderEnum(providerName);
    
    // Check if idempotency key exists to prevent duplicates
    let payment = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (payment && payment.metadata && (payment.metadata as any).checkoutUrl) {
      return { checkoutUrl: (payment.metadata as any).checkoutUrl };
    }

    try {
      const result = await provider.createCheckout(input);

      // Record in DB
      payment = await this.prisma.payment.create({
        data: {
          shopId,
          provider: providerEnum,
          providerPaymentId: result.providerPaymentId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.PENDING,
          idempotencyKey: input.idempotencyKey,
          metadata: { checkoutUrl: result.checkoutUrl, ...input.metadata },
        },
      });

      return { checkoutUrl: result.checkoutUrl };
    } catch (error: any) {
      this.logger.error(`Error creating payment with ${providerName}: ${error.message}`);
      throw new HttpException('Payment creation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyPayment(providerName: string, providerPaymentId: string) {
    const provider = this.getProvider(providerName);
    const providerEnum = this.mapProviderEnum(providerName);
    const verification = await provider.verifyPayment(providerPaymentId);
    
    const status = verification.status as PaymentStatus;
    if (status !== PaymentStatus.PENDING) {
      await this.prisma.payment.updateMany({
        where: { providerPaymentId, provider: providerEnum },
        data: { status },
      });
    }

    return verification;
  }

  async processWebhook(providerName: string, payload: Buffer | string, signature: string) {
    const provider = this.getProvider(providerName);
    const providerEnum = this.mapProviderEnum(providerName);
    let event: WebhookEvent;
    
    try {
      event = await provider.handleWebhook(payload, signature);
    } catch (error: any) {
      this.logger.error(`Webhook signature verification failed for ${providerName}: ${error.message}`);
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log(`Processing webhook for ${providerName}, event: ${event.type}, status: ${event.status}`);

    // Update payment status
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: event.providerPaymentId, provider: providerEnum },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: event.status as PaymentStatus },
      });

      if (event.status === 'SUCCESS' && event.metadata && event.metadata.subscriptionId) {
        await this.prisma.subscription.update({
          where: { id: event.metadata.subscriptionId },
          data: { status: SubscriptionStatus.ACTIVE },
        });
      }

      if (event.status === 'DISPUTED') {
        if (event.metadata && event.metadata.subscriptionId) {
          await this.prisma.subscription.update({
            where: { id: event.metadata.subscriptionId },
            data: { status: SubscriptionStatus.DISPUTED },
          });
        }
      }
    } else {
      this.logger.warn(`Payment not found for providerPaymentId: ${event.providerPaymentId}`);
    }

    return { received: true };
  }
}
