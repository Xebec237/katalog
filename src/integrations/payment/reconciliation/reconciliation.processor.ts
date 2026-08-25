import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReconciliationService } from './reconciliation.service';
import { Logger } from '@nestjs/common';

@Processor('reconciliation')
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(private readonly reconciliationService: ReconciliationService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    
    if (job.name === 'daily-reconciliation') {
      await this.reconciliationService.reconcilePendingPayments();
    }
  }
}
