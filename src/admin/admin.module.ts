import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditModule } from '@/audit/audit.module';
import { TemplatesModule } from '@/templates/templates.module';

@Module({
  imports: [AuditModule, TemplatesModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
