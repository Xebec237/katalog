import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class ShopAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const shopId = request.params.shopId || request.body.shopId || request.query.shopId;

    if (!shopId) return true;

    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
      return true;
    }

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication required');
    }

    const membership = await this.prisma.shopMember.findUnique({
      where: {
        shopId_userId: {
          shopId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this shop');
    }

    request.shopMembership = membership;
    return true;
  }
}
