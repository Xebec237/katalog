import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentProviderInterface,
  CreateCheckoutInput,
  CheckoutResult,
  PaymentVerification,
  WebhookEvent,
  SubscriptionInfo,
} from '../interfaces/payment-provider.interface';

export class NotchpayAdapter implements PaymentProviderInterface {
  readonly providerName = 'notchpay';
  private apiKey: string;
  private baseUrl = 'https://api.notchpay.co';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('NOTCHPAY_API_KEY');
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const payload = {
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      customer: {
        email: input.customerEmail,
        name: input.customerName,
      },
      reference: input.idempotencyKey,
      callback: input.webhookUrl,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    };

    const response = await fetch(`${this.baseUrl}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey, // Assuming this acts as a bearer/auth token
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`NotchPay checkout error: ${data.message}`);
    }

    return {
      checkoutUrl: data.authorization_url,
      providerPaymentId: data.reference,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<PaymentVerification> {
    const response = await fetch(`${this.baseUrl}/payments/${providerPaymentId}`, {
      method: 'GET',
      headers: {
        Authorization: this.apiKey,
      },
    });

    const data = await response.json();

    let status: PaymentVerification['status'] = 'PENDING';
    if (data.transaction && data.transaction.status === 'complete') {
      status = 'SUCCESS';
    } else if (data.transaction && data.transaction.status === 'failed') {
      status = 'FAILED';
    } else if (data.transaction && data.transaction.status === 'canceled') {
      status = 'EXPIRED';
    }

    return {
      status,
      providerPaymentId,
      amount: data.transaction ? data.transaction.amount : undefined,
    };
  }

  async handleWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent> {
    const hash = crypto.createHmac('sha256', this.apiKey).update(payload.toString()).digest('hex');
    
    if (hash !== signature) {
      throw new Error('NotchPay webhook signature verification failed');
    }

    const event = JSON.parse(payload.toString());

    let status: WebhookEvent['status'] = 'FAILED';
    if (event.event === 'payment.complete') {
      status = 'SUCCESS';
    }

    return {
      type: event.event,
      providerPaymentId: event.data.reference,
      status,
      amount: event.data.amount,
      metadata: event.data.metadata,
      rawEvent: event,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    throw new Error('Not supported by NotchPay implementation');
  }

  async getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null> {
    throw new Error('Not supported by NotchPay implementation');
  }
}
