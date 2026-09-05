import { Module } from '@nestjs/common';
import { CataloguesService } from './catalogues.service';
import { CataloguesController } from './catalogues.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SubscriptionsModule, AuditModule],
  controllers: [CataloguesController],
  providers: [CataloguesService],
  exports: [CataloguesService],
})
export class CataloguesModule {}
