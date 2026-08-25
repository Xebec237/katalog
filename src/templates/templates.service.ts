import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { AuditService } from '@/audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAllActive() {
    return this.prisma.catalogueTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.catalogueTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(dto: CreateTemplateDto, userId: string) {
    const template = await this.prisma.catalogueTemplate.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        previewUrl: dto.previewUrl,
        configuration: dto.configuration || {},
        active: dto.active ?? true,
      },
    });
    await this.auditService.log(userId, AuditAction.CREATE, 'CatalogueTemplate', template.id, dto);
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto, userId: string) {
    const template = await this.findOne(id);
    const updated = await this.prisma.catalogueTemplate.update({
      where: { id },
      data: dto,
    });
    await this.auditService.log(userId, AuditAction.UPDATE, 'CatalogueTemplate', id, dto);
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.catalogueTemplate.delete({ where: { id } });
    await this.auditService.log(userId, AuditAction.DELETE, 'CatalogueTemplate', id);
  }
}
