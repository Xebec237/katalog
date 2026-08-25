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

export class PawapayAdapter implements PaymentProviderInterface {
  readonly providerName = 'pawapay';
  private apiKey: string;
  private baseUrl = 'https://api.pawapay.io/v1'; // Example URL

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('PAWAPAY_API_KEY');
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    // Basic implementation for PawaPay
    const payload = {
      depositId: input.idempotencyKey,
      amount: input.amount.toString(),
      currency: input.currency,
      returnUrl: input.returnUrl,
      reason: input.description,
      customerEmail: input.customerEmail,
    };

    const response = await fetch(`${this.baseUrl}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PawaPay checkout error: ${errorText}`);
    }

    const data = await response.json();

    return {
      checkoutUrl: data.redirectUrl, // Mocking where the user goes
      providerPaymentId: input.idempotencyKey,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<PaymentVerification> {
    const response = await fetch(`${this.baseUrl}/deposits/${providerPaymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      return { status: 'FAILED', providerPaymentId };
    }

    const data = await response.json();
    
    let status: PaymentVerification['status'] = 'PENDING';
    if (data.status === 'COMPLETED') {
      status = 'SUCCESS';
    } else if (data.status === 'FAILED') {
      status = 'FAILED';
    }

    return {
      status,
      providerPaymentId,
    };
  }

  async handleWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent> {
    // Signature verification logic for PawaPay
    const hash = crypto.createHmac('sha256', this.apiKey).update(payload.toString()).digest('hex');
    if (hash !== signature) {
      throw new Error('PawaPay webhook signature verification failed');
    }

    const event = JSON.parse(payload.toString());

    return {
      type: event.status,
      providerPaymentId: event.depositId,
      status: event.status === 'COMPLETED' ? 'SUCCESS' : 'FAILED',
      amount: parseFloat(event.amount),
      rawEvent: event,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    throw new Error('Not supported by PawaPay');
  }

  async getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null> {
    throw new Error('Not supported by PawaPay');
  }
}
