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

export class CinetpayAdapter implements PaymentProviderInterface {
  readonly providerName = 'cinetpay';
  private apiKey: string;
  private siteId: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('CINETPAY_API_KEY');
    this.siteId = this.configService.getOrThrow<string>('CINETPAY_SITE_ID');
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const payload = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      customer_email: input.customerEmail,
      customer_name: input.customerName || 'Customer',
      return_url: input.returnUrl,
      notify_url: input.webhookUrl,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    };

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.code !== '201') {
      throw new Error(`CinetPay checkout error: ${data.message} - ${data.description}`);
    }

    return {
      checkoutUrl: data.data.payment_url,
      providerPaymentId: input.idempotencyKey, // Cinetpay uses transaction_id as main ref
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<PaymentVerification> {
    const payload = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: providerPaymentId,
    };

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    let status: PaymentVerification['status'] = 'PENDING';
    if (data.code === '00' && data.data.status === 'ACCEPTED') {
      status = 'SUCCESS';
    } else if (data.data && data.data.status === 'REFUSED') {
      status = 'FAILED';
    }

    return {
      status,
      providerPaymentId,
      amount: data.data ? data.data.amount : undefined,
    };
  }

  async handleWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent> {
    // CinetPay uses an x-token signature header we can verify via hmac
    const hash = crypto.createHmac('sha256', this.apiKey).update(payload.toString()).digest('hex');
    
    if (hash !== signature) {
      throw new Error('CinetPay webhook signature verification failed');
    }

    // Usually CinetPay webhook sends a simple x-www-form-urlencoded or json with cpm_trans_id.
    // The standard process is to verify the payment via the check API once notified.
    const bodyStr = payload.toString();
    const parsed = new URLSearchParams(bodyStr);
    const transactionId = parsed.get('cpm_trans_id');

    if (!transactionId) {
      throw new Error('Invalid CinetPay webhook payload: missing cpm_trans_id');
    }

    // Call verify to get real status
    const verification = await this.verifyPayment(transactionId);

    return {
      type: 'payment.status_changed',
      providerPaymentId: transactionId,
      status: verification.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      amount: verification.amount,
      rawEvent: Object.fromEntries(parsed.entries()),
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    throw new Error('Not supported by CinetPay');
  }

  async getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null> {
    throw new Error('Not supported by CinetPay');
  }
}
