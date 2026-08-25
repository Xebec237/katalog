import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PaginationDto } from '@/common/pagination/pagination.dto';
import { ShopMemberRole } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createShopDto: CreateShopDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } }
    });
    
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    
    const maxShops = user.subscription?.plan?.maxShops || 1;
    
    const activeShopsCount = await this.prisma.shop.count({
      where: {
        members: { some: { userId, role: ShopMemberRole.OWNER } },
        deletedAt: null
      }
    });

    if (activeShopsCount >= maxShops) {
      throw new ForbiddenException(`Quota de boutiques atteint (${maxShops})`);
    }

    const slug = createShopDto.slug || slugify(createShopDto.name, { lower: true, strict: true });
    
    const reservedSlug = await this.prisma.reservedSlug.findUnique({ where: { slug } });
    if (reservedSlug) {
      throw new ConflictException('Ce lien est réservé et ne peut pas être utilisé');
    }

    const existingShop = await this.prisma.shop.findUnique({ where: { slug } });
    if (existingShop) {
      throw new ConflictException('Ce lien est déjà utilisé par une autre boutique');
    }

    return this.prisma.shop.create({
      data: {
        ...createShopDto,
        slug,
        members: {
          create: {
            userId,
            role: ShopMemberRole.OWNER
          }
        },
        settings: {
          create: {}
        }
      }
    });
  }

  async findUserShops(userId: string, paginationDto: PaginationDto) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({
        where: {
          members: { some: { userId } },
          deletedAt: null
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.shop.count({
        where: {
          members: { some: { userId } },
          deletedAt: null
        }
      })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id, deletedAt: null },
      include: { settings: true }
    });

    if (!shop) throw new NotFoundException('Boutique non trouvée');
    return shop;
  }

  async update(id: string, updateShopDto: UpdateShopDto) {
    if (updateShopDto.slug) {
      const existing = await this.prisma.shop.findFirst({
        where: { slug: updateShopDto.slug, id: { not: id } }
      });
      if (existing) throw new ConflictException('Ce lien est déjà utilisé');
    }

    return this.prisma.shop.update({
      where: { id },
      data: updateShopDto
    });
  }

  async softDelete(id: string) {
    return this.prisma.shop.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async addMember(shopId: string, addMemberDto: AddMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { email: addMemberDto.email } });
    if (!user) throw new NotFoundException('Utilisateur avec cet email non trouvé');

    const existingMember = await this.prisma.shopMember.findUnique({
      where: { shopId_userId: { shopId, userId: user.id } }
    });

    if (existingMember) throw new ConflictException('L\'utilisateur est déjà membre de cette boutique');

    return this.prisma.shopMember.create({
      data: {
        shopId,
        userId: user.id,
        role: addMemberDto.role
      }
    });
  }

  async getMembers(shopId: string, paginationDto: PaginationDto) {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.shopMember.findMany({
        where: { shopId },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        skip,
        take: limit
      }),
      this.prisma.shopMember.count({ where: { shopId } })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async removeMember(shopId: string, memberId: string) {
    return this.prisma.shopMember.delete({
      where: { id: memberId }
    });
  }

  async getSettings(shopId: string) {
    const settings = await this.prisma.shopSettings.findUnique({ where: { shopId } });
    if (!settings) throw new NotFoundException('Paramètres introuvables');
    return settings;
  }

  async updateSettings(shopId: string, updateSettingsDto: UpdateSettingsDto) {
    return this.prisma.shopSettings.upsert({
      where: { shopId },
      update: updateSettingsDto,
      create: { shopId, ...updateSettingsDto }
    });
  }
}
