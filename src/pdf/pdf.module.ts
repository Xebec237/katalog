import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PdfProcessor } from './pdf.processor';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';
import { StorageModule } from '@/integrations/storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'pdf-generation',
    }),
    SubscriptionsModule,
    StorageModule,
  ],
  controllers: [PdfController],
  providers: [PdfService, PdfProcessor],
  exports: [PdfService],
})
export class PdfModule {}
