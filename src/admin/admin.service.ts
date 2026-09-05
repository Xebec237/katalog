import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, AuditAction, ProductStatus, ModerationStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getUsers(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { ownedShops: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(targetUserId: string, role: string, adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can change roles');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: role as UserRole },
    });

    await this.auditService.log({
      userId: adminId,
      action: AuditAction.UPDATE,
      entity: 'UserRole',
      entityId: targetUserId,
      changes: { role },
    });
    return updated;
  }

  async getShops(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.shop.findMany({
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { email: true } } },
      }),
      this.prisma.shop.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getProducts(query: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = query;
    const where = status ? { status: status as ProductStatus } : {};
    
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { shop: { select: { name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async moderateProduct(productId: string, action: 'approve' | 'reject', adminId: string) {
    const status = action === 'approve' ? ProductStatus.ACTIVE : ProductStatus.PENDING_REVIEW;
    
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    if (action === 'approve') {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { moderationStatus: ModerationStatus.APPROVED },
      });
    }

    const auditAction = action === 'approve' ? AuditAction.APPROVE : AuditAction.REJECT;
    await this.auditService.log({
      userId: adminId,
      action: auditAction,
      entity: 'Product',
      entityId: productId,
    });
    
    return updated;
  }

  async getSubscriptions(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { plan: true, shop: { select: { name: true } } },
      }),
      this.prisma.subscription.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getPayments(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { subscription: { include: { shop: { select: { name: true } } } } },
      }),
      this.prisma.payment.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getReservedSlugs() {
    return this.prisma.reservedSlug.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addReservedSlug(slug: string, reason: string) {
    return this.prisma.reservedSlug.create({ data: { slug, reason } });
  }

  async removeReservedSlug(id: string) {
    return this.prisma.reservedSlug.delete({ where: { id } });
  }

  async getStats() {
    const [users, shops, products, payments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.shop.count(),
      this.prisma.product.count(),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers: users,
      totalShops: shops,
      totalProducts: products,
      totalRevenue: payments._sum.amount ? Number(payments._sum.amount) : 0,
    };
  }

  async getAuditLogs(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }
}
