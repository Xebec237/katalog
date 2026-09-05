import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getCatalogue(slug: string) {
    const cacheKey = `public:catalogue:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const catalogue = await this.prisma.catalogue.findUnique({
      where: { publicSlug: slug, published: true },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            coverUrl: true,
            country: true,
            city: true,
            currency: true,
            phone: true,
            whatsapp: true,
            settings: {
              select: { primaryColor: true, secondaryColor: true, fontFamily: true }
            }
          }
        },
        template: { select: { configuration: true, name: true } },
      }
    });

    if (!catalogue) throw new NotFoundException('Catalogue not found');

    const categories = await this.prisma.category.findMany({
      where: { shopId: catalogue.shop.id },
      select: { id: true, name: true, slug: true, parentId: true }
    });

    const result = {
      id: catalogue.id,
      shop: catalogue.shop,
      template: catalogue.template,
      categories,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300); // 5 min TTL
    return result;
  }

  async getProducts(slug: string, query: { page: number; limit: number; categoryId?: string }) {
    const catalogue = await this.getCatalogue(slug);
    const shopId = catalogue.shop.id;

    const { page, limit, categoryId } = query;
    const where: any = { shopId, status: 'ACTIVE', deletedAt: null };
    if (categoryId) where.categoryId = categoryId;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        include: {
          images: {
            where: { moderationStatus: 'APPROVED' },
            select: { id: true, processedUrl: true, thumbnailUrl: true, position: true }
          },
          category: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        currency: p.currency,
        images: p.images,
        category: p.category
      })),
      meta: { total, page, limit }
    };
  }

  async getProduct(slug: string, productSlug: string) {
    const catalogue = await this.getCatalogue(slug);
    
    const product = await this.prisma.product.findFirst({
      where: {
        shopId: catalogue.shop.id,
        slug: productSlug,
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        images: {
          where: { moderationStatus: 'APPROVED' },
          select: { id: true, processedUrl: true, thumbnailUrl: true, position: true }
        },
        category: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!product) throw new NotFoundException('Product not found');

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      currency: product.currency,
      images: product.images,
      category: product.category
    };
  }

  async getSeoMetadata(slug: string) {
    const catalogue = await this.getCatalogue(slug);
    const shop = catalogue.shop;
    
    const settings = await this.prisma.shopSetting.findUnique({
      where: { shopId: shop.id }
    });

    return {
      title: settings?.metaTitle || `${shop.name} - Catalogue`,
      description: settings?.metaDescription || shop.description || 'Découvrez nos produits',
      ogImage: settings?.ogImageUrl || shop.coverUrl || shop.logoUrl,
      twitterCard: 'summary_large_image',
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": shop.name,
        "description": shop.description,
        "telephone": shop.phone,
        "address": {
          "@type": "PostalAddress",
          "addressCountry": shop.country,
          "addressLocality": shop.city
        }
      }
    };
  }
}
