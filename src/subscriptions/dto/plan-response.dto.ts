import { ApiProperty } from '@nestjs/swagger';

export class PlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  priceMonthly: number;

  @ApiProperty()
  priceYearly: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  maxShops: number;

  @ApiProperty()
  maxProducts: number;

  @ApiProperty()
  maxCatalogues: number;

  constructor(partial: Partial<PlanResponseDto>) {
    Object.assign(this, partial);
    if (partial.priceMonthly) this.priceMonthly = Number(partial.priceMonthly);
    if (partial.priceYearly) this.priceYearly = Number(partial.priceYearly);
  }
}
