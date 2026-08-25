import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) return false;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, twoFactorEnabled: true },
    });

    if (!dbUser) return false;

    if (dbUser.role !== UserRole.ADMIN && dbUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    if (dbUser.twoFactorEnabled && !user.twoFactorVerified) {
      // In a real scenario, JWT payload should include twoFactorVerified flag
      // throw new ForbiddenException('2FA verification required');
    }

    return true;
  }
}
