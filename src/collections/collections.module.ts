import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService, PrismaService],
  exports: [CollectionsService]
})
export class CollectionsModule {}
