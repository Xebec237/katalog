import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '@/common/constants/injection-tokens';
import { PaymentProviderInterface, CreateCheckoutInput, WebhookEvent } from './interfaces/payment-provider.interface';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly paymentProviders: PaymentProviderInterface[],
    private readonly prisma: PrismaService,
  ) {}

  private getProvider(name: string): PaymentProviderInterface {
    const provider = this.paymentProviders.find(p => p.providerName === name);
    if (!provider) {
      throw new HttpException(`Payment provider ${name} not found`, HttpStatus.BAD_REQUEST);
    }
    return provider;
  }

  async createPayment(providerName: string, shopId: string, input: CreateCheckoutInput) {
    const provider = this.getProvider(providerName);
    
    // Check if idempotency key exists to prevent duplicates
    let payment = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (payment) {
      return { checkoutUrl: payment.checkoutUrl };
    }

    try {
      const result = await provider.createCheckout(input);

      // Record in DB
      payment = await this.prisma.payment.create({
        data: {
          shopId,
          provider: providerName,
          providerPaymentId: result.providerPaymentId,
          amount: input.amount,
          currency: input.currency,
          status: 'PENDING',
          idempotencyKey: input.idempotencyKey,
          checkoutUrl: result.checkoutUrl,
        },
      });

      return { checkoutUrl: result.checkoutUrl };
    } catch (error) {
      this.logger.error(`Error creating payment with ${providerName}: ${error.message}`);
      throw new HttpException('Payment creation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyPayment(providerName: string, providerPaymentId: string) {
    const provider = this.getProvider(providerName);
    const verification = await provider.verifyPayment(providerPaymentId);
    
    if (verification.status !== 'PENDING') {
      await this.prisma.payment.updateMany({
        where: { providerPaymentId, provider: providerName },
        data: { status: verification.status },
      });
    }

    return verification;
  }

  async processWebhook(providerName: string, payload: Buffer | string, signature: string) {
    const provider = this.getProvider(providerName);
    let event: WebhookEvent;
    
    try {
      event = await provider.handleWebhook(payload, signature);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed for ${providerName}: ${error.message}`);
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log(`Processing webhook for ${providerName}, event: ${event.type}, status: ${event.status}`);

    // Update payment status
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: event.providerPaymentId, provider: providerName },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: event.status },
      });

      if (event.status === 'SUCCESS' && event.metadata && event.metadata.subscriptionId) {
        // Activate subscription - NEVER trust frontend, only webhook
        await this.prisma.subscription.update({
          where: { id: event.metadata.subscriptionId },
          data: { status: 'ACTIVE' },
        });
      }

      if (event.status === 'DISPUTED') {
        // Suspend premium access
        if (event.metadata && event.metadata.subscriptionId) {
          await this.prisma.subscription.update({
            where: { id: event.metadata.subscriptionId },
            data: { status: 'DISPUTED' },
          });
        }
      }
    } else {
      this.logger.warn(`Payment not found for providerPaymentId: ${event.providerPaymentId}`);
    }

    return { received: true };
  }
}
