import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../subscriptions/quota.service';
import { CreateCatalogueDto } from './dto/create-catalogue.dto';
import { UpdateCatalogueDto } from './dto/update-catalogue.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CataloguesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly auditService: AuditService,
  ) {}

  async create(shopId: string, dto: CreateCatalogueDto, userId: string) {
    await this.quotaService.checkCatalogueQuota(shopId);

    const catalogue = await this.prisma.catalogue.create({
      data: {
        shopId,
        templateId: dto.templateId,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'Catalogue',
      entityId: catalogue.id,
      changes: dto,
    });
    return catalogue;
  }

  async findAll(shopId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    return Promise.all([
      this.prisma.catalogue.findMany({
        where: { shopId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.catalogue.count({ where: { shopId } }),
    ]);
  }

  async findOne(shopId: string, id: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { id, shopId },
      include: { template: true },
    });
    if (!catalogue) throw new NotFoundException('Catalogue not found');
    return catalogue;
  }

  async update(shopId: string, id: string, dto: UpdateCatalogueDto, userId: string) {
    const catalogue = await this.findOne(shopId, id);
    const updated = await this.prisma.catalogue.update({
      where: { id: catalogue.id },
      data: { templateId: dto.templateId },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Catalogue',
      entityId: id,
      changes: dto,
    });
    return updated;
  }

  async remove(shopId: string, id: string, userId: string) {
    const catalogue = await this.findOne(shopId, id);
    await this.prisma.catalogue.delete({ where: { id: catalogue.id } });
    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'Catalogue',
      entityId: id,
    });
  }

  async publish(shopId: string, id: string, userId: string) {
    const catalogue = await this.findOne(shopId, id);
    let publicSlug = catalogue.publicSlug;
    if (!publicSlug) {
      publicSlug = `${shopId.substring(0,8)}-${uuidv4().substring(0,8)}`;
    }
    const published = await this.prisma.catalogue.update({
      where: { id: catalogue.id },
      data: { published: true, publicSlug },
    });
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Catalogue',
      entityId: id,
      changes: { published: true },
    });
    return published;
  }

  async unpublish(shopId: string, id: string, userId: string) {
    const catalogue = await this.findOne(shopId, id);
    const unpublished = await this.prisma.catalogue.update({
      where: { id: catalogue.id },
      data: { published: false },
    });
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'Catalogue',
      entityId: id,
      changes: { published: false },
    });
    return unpublished;
  }
}
