import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Prisma 6 extensions for soft delete
    this.$extends({
      query: {
        $allModels: {
          async findMany({ args, query }) {
            args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findFirstOrThrow({ args, query }) {
            args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findUnique({ args, query }) {
            args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findUniqueOrThrow({ args, query }) {
            args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async count({ args, query }) {
            if (args) {
              args.where = { deletedAt: null, ...args.where };
            }
            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onApplicationShutdown(signal?: string) {
    await this.$disconnect();
  }
}
