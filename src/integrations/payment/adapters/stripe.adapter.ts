import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProviderInterface,
  CreateCheckoutInput,
  CheckoutResult,
  PaymentVerification,
  WebhookEvent,
  SubscriptionInfo,
} from '../interfaces/payment-provider.interface';

export class StripeAdapter implements PaymentProviderInterface {
  readonly providerName = 'stripe';
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: {
              name: input.description,
            },
            unit_amount: Math.round(input.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Or 'subscription' depending on the use case, but we default to payment here for general checkout
      success_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: input.metadata,
      client_reference_id: input.idempotencyKey,
    }, {
      idempotencyKey: input.idempotencyKey,
    });

    return {
      checkoutUrl: session.url!,
      providerPaymentId: session.id,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<PaymentVerification> {
    const session = await this.stripe.checkout.sessions.retrieve(providerPaymentId);
    
    let status: PaymentVerification['status'] = 'PENDING';
    if (session.payment_status === 'paid') {
      status = 'SUCCESS';
    } else if (session.status === 'expired') {
      status = 'EXPIRED';
    }

    return {
      status,
      providerPaymentId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : undefined,
    };
  }

  async handleWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent> {
    let event: Stripe.Event;
    
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (err) {
      throw new Error(`Stripe webhook signature verification failed: ${err.message}`);
    }

    let status: WebhookEvent['status'] = 'FAILED';
    let providerPaymentId = '';
    let amount: number | undefined;
    let metadata: Record<string, string> | undefined;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        providerPaymentId = session.id;
        amount = session.amount_total ? session.amount_total / 100 : undefined;
        metadata = session.metadata as Record<string, string>;
        if (session.payment_status === 'paid') {
          status = 'SUCCESS';
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        // In reality, you'd map the charge back to the checkout session or payment intent.
        providerPaymentId = charge.payment_intent as string; 
        status = 'REFUNDED';
        break;
      }
      case 'charge.dispute.created':
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        providerPaymentId = dispute.payment_intent as string;
        status = 'DISPUTED';
        break;
      }
      default:
        // Other events can be safely ignored or logged
        providerPaymentId = event.id; // generic ID
    }

    return {
      type: event.type,
      providerPaymentId,
      status,
      amount,
      metadata,
      rawEvent: event,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(providerSubscriptionId);
  }

  async getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };
    } catch {
      return null;
    }
  }
}
