import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { ProductStatus, SubscriptionStatus } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shopId: string, createProductDto: CreateProductDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId, deletedAt: null },
    });

    if (!shop) throw new NotFoundException('Boutique introuvable');

    const sub = await this.prisma.subscription.findFirst({
      where: { shopId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });

    const maxProducts = sub?.plan?.maxProducts || 20;

    const productsCount = await this.prisma.product.count({
      where: { shopId, deletedAt: null },
    });

    if (productsCount >= maxProducts) {
      throw new ForbiddenException(`Quota de produits atteint (${maxProducts})`);
    }

    const slug = slugify(createProductDto.name, { lower: true, strict: true }) + '-' + Date.now().toString().slice(-4);

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        shopId,
        slug,
        status: createProductDto.status || ProductStatus.DRAFT,
      },
    });
  }

  async findAll(shopId: string, filter: ProductFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { shopId, deletedAt: null };
    if (filter.status) whereClause.status = filter.status;
    if (filter.categoryId) whereClause.categoryId = filter.categoryId;
    if (filter.search) {
      whereClause.name = { contains: filter.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: whereClause,
        include: { images: { orderBy: { position: 'asc' } }, category: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(shopId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, shopId, deletedAt: null },
      include: { images: { orderBy: { position: 'asc' } }, category: true },
    });

    if (!product) throw new NotFoundException('Produit non trouvé');
    return product;
  }

  async update(shopId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findById(shopId, productId);
    
    let slug = product.slug;
    if (dto.name && dto.name !== product.name) {
      slug = slugify(dto.name, { lower: true, strict: true });
      const existing = await this.prisma.product.findFirst({
        where: { shopId, slug, id: { not: productId } },
      });
      if (existing) slug += '-' + Date.now().toString().slice(-4);
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: { ...dto, slug },
    });
  }

  async softDelete(shopId: string, productId: string) {
    await this.findById(shopId, productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
  }

  async changeStatus(shopId: string, productId: string, status: ProductStatus) {
    await this.findById(shopId, productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });
  }

  async addImage(shopId: string, productId: string, file: Express.Multer.File) {
    await this.findById(shopId, productId);
    
    const imageUrl = `/uploads/${file.originalname}`; 
    const count = await this.prisma.productImage.count({ where: { productId } });

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        originalUrl: imageUrl,
        position: count,
      },
    });

    return image;
  }

  async removeImage(shopId: string, productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image introuvable');

    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async reorderImages(shopId: string, productId: string, dto: ReorderImagesDto) {
    await this.findById(shopId, productId);

    const updates = dto.images.map(img => 
      this.prisma.productImage.update({
        where: { id: img.id },
        data: { position: img.position },
      })
    );

    await this.prisma.$transaction(updates);
    return { success: true };
  }
}
