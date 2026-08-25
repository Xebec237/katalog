import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ShopAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const shopId = request.params.shopId || request.body.shopId || request.query.shopId;

    if (!shopId) return true;

    if (user.role === 'ADMIN') return true;

    const membership = await this.prisma.shopMember.findUnique({
      where: {
        shop_id_user_id: {
          shop_id: shopId,
          user_id: user.id,
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
