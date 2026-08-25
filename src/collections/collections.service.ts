import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { PaginationDto } from '@/common/pagination/pagination.dto';
import slugify from 'slugify';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shopId: string, dto: CreateCollectionDto) {
    const slug = dto.slug || slugify(dto.name, { lower: true, strict: true });
    
    return this.prisma.collection.create({
      data: {
        ...dto,
        slug,
        shopId
      }
    });
  }

  async findAll(shopId: string, paginationDto: PaginationDto) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.collection.findMany({
        where: { shopId },
        include: {
          _count: { select: { products: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.collection.count({ where: { shopId } })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(shopId: string, id: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, shopId },
      include: {
        products: {
          include: { product: true }
        }
      }
    });

    if (!collection) throw new NotFoundException('Collection introuvable');
    return collection;
  }

  async update(shopId: string, id: string, dto: UpdateCollectionDto) {
    await this.findById(shopId, id);

    const data: any = { ...dto };
    if (dto.name && !dto.slug) {
      data.slug = slugify(dto.name, { lower: true, strict: true });
    }

    return this.prisma.collection.update({
      where: { id },
      data
    });
  }

  async remove(shopId: string, id: string) {
    await this.findById(shopId, id);
    return this.prisma.collection.delete({ where: { id } });
  }

  async addProducts(shopId: string, collectionId: string, productIds: string[]) {
    await this.findById(shopId, collectionId);

    const validProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        shopId,
        deletedAt: null
      },
      select: { id: true }
    });

    const validProductIds = validProducts.map(p => p.id);

    const creations = validProductIds.map(productId => ({
      collectionId,
      productId
    }));

    await this.prisma.productCollection.createMany({
      data: creations,
      skipDuplicates: true
    });

    return { success: true, added: validProductIds.length };
  }

  async removeProduct(shopId: string, collectionId: string, productId: string) {
    await this.findById(shopId, collectionId);
    
    return this.prisma.productCollection.deleteMany({
      where: { collectionId, productId }
    });
  }
}
