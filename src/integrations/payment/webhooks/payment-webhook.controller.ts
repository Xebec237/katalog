import { Controller, Post, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from '../payment.service';

// Decorator to skip JWT auth (assuming it exists in common/decorators)
// If it doesn't exist, you'd normally use standard NestJS patterns
export const Public = () => (target: any, key?: string, descriptor?: any) => {
  if (descriptor) {
    Reflect.defineMetadata('isPublic', true, descriptor.value);
    return descriptor;
  }
  Reflect.defineMetadata('isPublic', true, target);
  return target;
};

@Controller('api/webhooks')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('stripe')
  async handleStripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    const payload = req.rawBody || req.body;
    return this.paymentService.processWebhook('stripe', payload, signature);
  }

  @Public()
  @Post('cinetpay')
  async handleCinetpayWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-token') signature: string) {
    const payload = req.rawBody || req.body;
    return this.paymentService.processWebhook('cinetpay', payload, signature);
  }

  @Public()
  @Post('notchpay')
  async handleNotchpayWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-notch-signature') signature: string) {
    const payload = req.rawBody || req.body;
    return this.paymentService.processWebhook('notchpay', payload, signature);
  }

  @Public()
  @Post('pawapay')
  async handlePawapayWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-pawapay-signature') signature: string) {
    const payload = req.rawBody || req.body;
    return this.paymentService.processWebhook('pawapay', payload, signature);
  }
}
