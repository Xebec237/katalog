import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/integrations/storage/storage.service';
import { AiService } from '@/integrations/ai/ai.service';
import { ImageJobStatus, ModerationStatus, ProductStatus } from '@prisma/client';
import sharp from 'sharp';

@Processor('image-processing', { concurrency: 2 })
export class ImageProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    const { jobId, shopId, productId, imageId, originalKey } = job.data;
    
    const updateJob = async (status: ImageJobStatus, data = {}) => {
      await this.prisma.imageProcessingJob.update({
        where: { id: jobId },
        data: { status, ...data },
      });
    };

    try {
      await updateJob(ImageJobStatus.UPLOADING, { startedAt: new Date() });
      const originalBuffer = await this.storageService.getFile(originalKey);
      const originalUrl = this.storageService.getPublicUrl(originalKey);

      await updateJob(ImageJobStatus.VALIDATING);
      const metadata = await sharp(originalBuffer).metadata();
      if (!metadata) throw new Error('Invalid image format');

      await updateJob(ImageJobStatus.MODERATING);
      const moderationResult = await this.aiService.moderateImageContent(originalUrl);
      if (!moderationResult.safe) {
        await this.prisma.productImage.update({
          where: { id: imageId },
          data: { moderationStatus: ModerationStatus.FLAGGED },
        });
        await this.prisma.product.update({
          where: { id: productId },
          data: { status: ProductStatus.PENDING_REVIEW },
        });
      }

      await updateJob(ImageJobStatus.ANALYZING);
      const analysisResult = await this.aiService.analyzeProductImage(shopId, originalUrl);
      
      await updateJob(ImageJobStatus.DETECTING);
      const boundingBox = await this.aiService.detectProductBoundingBox(shopId, originalUrl);

      await updateJob(ImageJobStatus.CROPPING);
      let processedBuffer = originalBuffer;
      if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
        processedBuffer = await sharp(originalBuffer)
          .extract({
            left: Math.max(0, Math.floor(boundingBox.x)),
            top: Math.max(0, Math.floor(boundingBox.y)),
            width: Math.floor(boundingBox.width),
            height: Math.floor(boundingBox.height),
          })
          .toBuffer();
      }

      await updateJob(ImageJobStatus.OPTIMIZING);
      processedBuffer = await sharp(processedBuffer)
        .resize({ width: 2000, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      await updateJob(ImageJobStatus.GENERATING_THUMBNAIL);
      const thumbnailBuffer = await sharp(processedBuffer)
        .resize({ width: 400 })
        .webp({ quality: 80 })
        .toBuffer();

      await updateJob(ImageJobStatus.STORING);
      const processedKey = `shops/${shopId}/products/${productId}/processed-${Date.now()}.webp`;
      const thumbnailKey = `shops/${shopId}/products/${productId}/thumbnail-${Date.now()}.webp`;
      
      const processedUrl = await this.storageService.uploadFile(processedBuffer, processedKey, 'image/webp');
      const thumbnailUrl = await this.storageService.uploadFile(thumbnailBuffer, thumbnailKey, 'image/webp');

      await this.prisma.productImage.update({
        where: { id: imageId },
        data: {
          processedUrl,
          thumbnailUrl,
          width: metadata.width,
          height: metadata.height,
        },
      });

      await updateJob(ImageJobStatus.COMPLETED, {
        processedKey,
        thumbnailKey,
        analysisResult: analysisResult as any,
        completedAt: new Date(),
      });

    } catch (error: any) {
      await updateJob(ImageJobStatus.FAILED, {
        error: error.message,
        completedAt: new Date(),
      });
      throw error;
    }
  }
}
