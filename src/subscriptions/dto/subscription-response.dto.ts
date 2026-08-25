import { ApiProperty } from '@nestjs/swagger';
import { PlanResponseDto } from './plan-response.dto';

export class SubscriptionResponseDto {
  @ApiProperty()
  id?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currentPeriodEnd?: Date;

  @ApiProperty({ type: () => PlanResponseDto })
  plan: PlanResponseDto;

  constructor(partial: any) {
    this.id = partial.id;
    this.status = partial.status;
    this.currentPeriodEnd = partial.currentPeriodEnd;
    this.plan = new PlanResponseDto(partial.plan);
  }
}
