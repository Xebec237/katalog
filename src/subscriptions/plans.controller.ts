import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { PlanResponseDto } from './dto/plan-response.dto';

@ApiTags('Plans')
@Controller('api/plans')
export class PlansController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List active plans' })
  @ApiResponse({ status: 200, type: [PlanResponseDto] })
  async getPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map(plan => new PlanResponseDto(plan));
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get plan details' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  async getPlan(@Param('planId') planId: string) {
    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { id: planId, active: true },
    });
    return new PlanResponseDto(plan);
  }
}
