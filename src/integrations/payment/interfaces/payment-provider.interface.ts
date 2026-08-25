export interface CreateCheckoutInput {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  providerPaymentId: string;
}

export interface PaymentVerification {
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'EXPIRED';
  providerPaymentId: string;
  amount?: number;
  paidAt?: Date;
}

export interface WebhookEvent {
  type: string;
  providerPaymentId: string;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'DISPUTED';
  amount?: number;
  metadata?: Record<string, string>;
  rawEvent?: any;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface PaymentProviderInterface {
  readonly providerName: string;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyPayment(providerPaymentId: string): Promise<PaymentVerification>;
  handleWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null>;
}
