import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { Transport, RedisOptions } from '@nestjs/microservices';

@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Get('health')
  checkHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  checkReady() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            url: this.configService.get('redisUrl'),
          },
        }),
    ]);
  }
}
