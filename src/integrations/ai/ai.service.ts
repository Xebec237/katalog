import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AI_PROVIDER } from '@/common/constants/injection-tokens';
import { AIProvider, ProductAnalysis, BoundingBox, ModerationResult } from './interfaces/ai-provider.interface';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
    private readonly prisma: PrismaService,
  ) {}

  private async checkQuotaAndRecord(shopId: string, feature: string): Promise<void> {
    // Assume shop owner is retrieved and quotas are checked
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new HttpException('Shop not found', HttpStatus.NOT_FOUND);

    // Simple quota check placeholder - logic would depend on the subscription plan
    // Record usage
    await this.prisma.aiGeneration.create({
      data: {
        shopId,
        feature,
      },
    });
  }

  async analyzeProductImage(shopId: string, imageUrl: string, locale?: string): Promise<ProductAnalysis> {
    await this.checkQuotaAndRecord(shopId, 'analyzeProductImage');
    try {
      return await this.aiProvider.analyzeProductImage(imageUrl, locale);
    } catch (error) {
      this.logger.error(`Error analyzing product image: ${error.message}`, error.stack);
      throw new HttpException('Failed to analyze product image', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async suggestProductName(shopId: string, imageUrl: string, locale?: string): Promise<string> {
    await this.checkQuotaAndRecord(shopId, 'suggestProductName');
    try {
      return await this.aiProvider.suggestProductName(imageUrl, locale);
    } catch (error) {
      this.logger.error(`Error suggesting product name: ${error.message}`, error.stack);
      throw new HttpException('Failed to suggest product name', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async suggestCategory(shopId: string, imageUrl: string, existingCategories: string[]): Promise<string> {
    await this.checkQuotaAndRecord(shopId, 'suggestCategory');
    try {
      return await this.aiProvider.suggestCategory(imageUrl, existingCategories);
    } catch (error) {
      this.logger.error(`Error suggesting category: ${error.message}`, error.stack);
      throw new HttpException('Failed to suggest category', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generateProductDescription(shopId: string, context: { name: string; category: string; locale?: string }): Promise<string> {
    await this.checkQuotaAndRecord(shopId, 'generateProductDescription');
    try {
      return await this.aiProvider.generateProductDescription(context);
    } catch (error) {
      this.logger.error(`Error generating product description: ${error.message}`, error.stack);
      throw new HttpException('Failed to generate product description', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async detectProductBoundingBox(shopId: string, imageUrl: string): Promise<BoundingBox | null> {
    await this.checkQuotaAndRecord(shopId, 'detectProductBoundingBox');
    try {
      return await this.aiProvider.detectProductBoundingBox(imageUrl);
    } catch (error) {
      this.logger.error(`Error detecting bounding box: ${error.message}`, error.stack);
      throw new HttpException('Failed to detect bounding box', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async moderateImageContent(imageUrl: string): Promise<ModerationResult> {
    try {
      return await this.aiProvider.moderateImageContent(imageUrl);
    } catch (error) {
      this.logger.error(`Error moderating image content: ${error.message}`, error.stack);
      throw new HttpException('Failed to moderate image content', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
