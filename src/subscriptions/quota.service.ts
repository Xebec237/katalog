import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class QuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subService: SubscriptionsService,
  ) {}

  async checkShopQuota(ownerId: string) {
    const count = await this.prisma.shop.count({ where: { ownerId, deletedAt: null } });
    // Assuming owner level check based on first shop or global setting, defaulting to max 1 for now if no specific shop provided
    if (count >= 1) throw new ForbiddenException('Quota de boutiques atteint.');
    return { allowed: true, current: count, max: 1 };
  }

  async checkProductQuota(shopId: string) {
    const sub = await this.subService.getCurrentSubscription(shopId);
    const maxProducts = sub.plan.maxProducts;
    
    const count = await this.prisma.product.count({
      where: { shopId, deletedAt: null },
    });

    if (count >= maxProducts) {
      throw new ForbiddenException('Le nombre maximum de produits pour votre abonnement est atteint.');
    }
    return { allowed: true, current: count, max: maxProducts };
  }

  async checkCatalogueQuota(shopId: string) {
    const sub = await this.subService.getCurrentSubscription(shopId);
    const maxCatalogues = sub.plan.maxCatalogues;
    
    const count = await this.prisma.catalogue.count({ where: { shopId } });

    if (count >= maxCatalogues) {
      throw new ForbiddenException('Le nombre maximum de catalogues pour votre abonnement est atteint.');
    }
    return { allowed: true, current: count, max: maxCatalogues };
  }

  async checkAiQuota(shopId: string, ownerId: string) {
    const sub = await this.subService.getCurrentSubscription(shopId);
    const maxAi = sub.plan.maxAiPerMonth;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.prisma.aiGeneration.count({
      where: { shopId, createdAt: { gte: startOfMonth } },
    });

    if (count >= maxAi) {
      throw new ForbiddenException("Quotas d'utilisation de l'IA atteints pour ce mois.");
    }
    return { allowed: true, current: count, max: maxAi };
  }

  async checkPdfQuota(shopId: string) {
    const sub = await this.subService.getCurrentSubscription(shopId);
    const maxPdf = sub.plan.maxPdfPerMonth;
    
    // In a real scenario, we'd track PDF generations in a table.
    // Assuming simple return for now since there's no explicit PdfGeneration table
    return { allowed: true, current: 0, max: maxPdf };
  }
}
