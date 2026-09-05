import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentService } from '../payment.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async reconcilePendingPayments() {
    this.logger.log('Starting payment reconciliation...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 1. Find all payments with status PENDING created more than 1 hour ago
    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        createdAt: {
          lt: oneHourAgo,
        },
      },
    });

    this.logger.log(`Found ${pendingPayments.length} pending payments to reconcile.`);

    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) continue;
      try {
        // 2. Calls provider.verifyPayment() for each
        const verification = await this.paymentService.verifyPayment(payment.provider, payment.providerPaymentId);

        // 3. Updates status to SUCCESS/FAILED/EXPIRED (handled in verifyPayment)
        // 4. Sets PENDING_RECONCILIATION if provider response is ambiguous
        if (verification.status === 'PENDING') {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.PENDING_RECONCILIATION },
          });
          this.logger.warn(`Payment ${payment.id} is still pending after reconciliation.`);
        } else {
          this.logger.log(`Payment ${payment.id} resolved to ${verification.status}`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to reconcile payment ${payment.id}: ${error.message}`);
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PENDING_RECONCILIATION },
        });
      }
    }

    this.logger.log('Payment reconciliation completed.');
  }
}
