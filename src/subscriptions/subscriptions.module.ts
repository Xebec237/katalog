import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { QuotaService } from './quota.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PlansController } from './plans.controller';
import { PaymentModule } from '@/integrations/payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [PlansController, SubscriptionsController],
  providers: [SubscriptionsService, QuotaService],
  exports: [SubscriptionsService, QuotaService],
})
export class SubscriptionsModule {}
