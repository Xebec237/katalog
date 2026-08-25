import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const ShopId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const shopId = request.params.shopId || request.body.shopId || request.query.shopId;
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    return shopId;
  },
);
