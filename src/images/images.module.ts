import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImagesService } from './images.service';
import { ImageProcessor } from './image.processor';
import { AIModule } from '../integrations/ai/ai.module';
import { StorageModule } from '../integrations/storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'image-processing',
    }),
    AIModule,
    StorageModule,
  ],
  providers: [ImagesService, ImageProcessor],
  exports: [ImagesService],
})
export class ImagesModule {}
