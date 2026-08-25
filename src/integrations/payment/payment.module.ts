import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER } from '@/common/constants/injection-tokens';
import { PaymentService } from './payment.service';
import { StripeAdapter } from './adapters/stripe.adapter';
import { CinetpayAdapter } from './adapters/cinetpay.adapter';
import { NotchpayAdapter } from './adapters/notchpay.adapter';
import { PawapayAdapter } from './adapters/pawapay.adapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { ReconciliationProcessor } from './reconciliation/reconciliation.processor';
import { PaymentWebhookController } from './webhooks/payment-webhook.controller';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({})
export class PaymentModule {
  static forRootAsync(): DynamicModule {
    return {
      module: PaymentModule,
      imports: [
        ConfigModule, 
        PrismaModule,
        BullModule.registerQueue({
          name: 'reconciliation',
        }),
      ],
      controllers: [PaymentWebhookController],
      providers: [
        {
          provide: PAYMENT_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const providers = [];
            // Initialize available providers based on env
            if (configService.get('STRIPE_SECRET_KEY')) {
              providers.push(new StripeAdapter(configService));
            }
            if (configService.get('CINETPAY_API_KEY')) {
              providers.push(new CinetpayAdapter(configService));
            }
            if (configService.get('NOTCHPAY_API_KEY')) {
              providers.push(new NotchpayAdapter(configService));
            }
            if (configService.get('PAWAPAY_API_KEY')) {
              providers.push(new PawapayAdapter(configService));
            }
            
            if (providers.length === 0) {
              // Add a default or log warning if no payment providers configured
            }
            
            return providers;
          },
          inject: [ConfigService],
        },
        PaymentService,
        ReconciliationService,
        ReconciliationProcessor,
      ],
      exports: [PaymentService, PAYMENT_PROVIDER],
    };
  }
}
