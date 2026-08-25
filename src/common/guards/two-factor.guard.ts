import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user && user.role === 'ADMIN' && !user.isTwoFactorAuthenticated) {
      throw new ForbiddenException('Two-factor authentication required for admin actions');
    }
    return true;
  }
}
