import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findGlobalCategories() {
    const categories = await this.prisma.category.findMany({
      where: { shopId: null }
    });
    return this.buildTree(categories);
  }

  async create(shopId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, OR: [{ shopId }, { shopId: null }] }
      });
      if (!parent) throw new NotFoundException('Catégorie parente invalide');
    }

    const slug = dto.slug || slugify(dto.name, { lower: true, strict: true });
    
    return this.prisma.category.create({
      data: {
        ...dto,
        shopId,
        slug
      }
    });
  }

  async findByShop(shopId: string) {
    const categories = await this.prisma.category.findMany({
      where: { OR: [{ shopId }, { shopId: null }] }
    });
    return this.buildTree(categories);
  }

  async findById(shopId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, OR: [{ shopId }, { shopId: null }] },
      include: {
        _count: { select: { products: true } }
      }
    });

    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  async update(shopId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({ where: { id, shopId } });
    if (!category) throw new NotFoundException('Catégorie introuvable ou non modifiable');

    const data: any = { ...dto };
    if (dto.name && !dto.slug) {
      data.slug = slugify(dto.name, { lower: true, strict: true });
    }

    return this.prisma.category.update({
      where: { id },
      data
    });
  }

  async delete(shopId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, shopId } });
    if (!category) throw new NotFoundException('Catégorie introuvable ou non modifiable');

    // Mettre à jour les produits pour enlever la catégorie
    await this.prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });

    return this.prisma.category.delete({ where: { id } });
  }

  private buildTree(categories: any[], parentId: string | null = null): any[] {
    return categories
      .filter(c => c.parentId === parentId)
      .map(c => ({
        ...c,
        children: this.buildTree(categories, c.id)
      }));
  }
}
