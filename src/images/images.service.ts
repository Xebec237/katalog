import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/integrations/storage/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImageJobStatus, ModerationStatus } from '@prisma/client';

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue('image-processing') private readonly imageQueue: Queue,
  ) {}

  async processUpload(file: Express.Multer.File, shopId: string, productId: string) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Image size must be less than 10MB');
    }

    const ext = file.originalname.split('.').pop();
    const originalKey = `shops/${shopId}/products/${productId}/original-${Date.now()}.${ext}`;
    
    // Upload original
    const originalUrl = await this.storageService.uploadFile(file.buffer, originalKey, file.mimetype);

    // Create ProductImage
    const productImage = await this.prisma.productImage.create({
      data: {
        productId,
        originalUrl,
        moderationStatus: ModerationStatus.PENDING,
      },
    });

    // Create Job
    const job = await this.prisma.imageProcessingJob.create({
      data: {
        shopId,
        imageId: productImage.id,
        status: ImageJobStatus.QUEUED,
        originalKey,
      },
    });

    // Dispatch job
    await this.imageQueue.add('process', {
      jobId: job.id,
      shopId,
      productId,
      imageId: productImage.id,
      originalKey,
    });

    return job;
  }

  async getJob(jobId: string) {
    const job = await this.prisma.imageProcessingJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }
}
