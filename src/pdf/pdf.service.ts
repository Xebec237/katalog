import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../subscriptions/quota.service';

@Injectable()
export class PdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    @InjectQueue('pdf-generation') private readonly pdfQueue: Queue,
  ) {}

  async generatePdf(catalogueId: string, shopId: string, userId: string) {
    await this.quotaService.checkPdfQuota(shopId);

    const catalogue = await this.prisma.catalogue.findUnique({
      where: { id: catalogueId, shopId },
    });
    if (!catalogue) throw new NotFoundException('Catalogue not found');

    const job = await this.pdfQueue.add('generate', {
      catalogueId,
      shopId,
      userId,
    });

    return job;
  }

  async getJobStatus(jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;

    return { id: jobId, state, progress, result };
  }
}
