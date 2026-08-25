import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ImagesModule } from './images/images.module';
import { CataloguesModule } from './catalogues/catalogues.module';
import { TemplatesModule } from './templates/templates.module';
import { PdfModule } from './pdf/pdf.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PublicModule } from './public/public.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';

// Integration Modules
import { StorageModule } from './integrations/storage/storage.module';
import { AIModule } from './integrations/ai/ai.module';
import { EmailModule } from './integrations/email/email.module';
import { PaymentModule } from './integrations/payment/payment.module';

@Module({
  imports: [
    // Core & Infrastructure
    ConfigModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    AuditModule,

    // Global Providers
    StorageModule.forRootAsync(),
    AIModule.forRootAsync(),
    EmailModule.forRootAsync(),
    PaymentModule.forRootAsync(),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 10,
    }, {
      name: 'medium',
      ttl: 60000,
      limit: 100,
    }, {
      name: 'long',
      ttl: 900000,
      limit: 1000,
    }]),

    // Background Queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get('redisUrl'),
        },
      }),
    }),

    // Business Modules
    AuthModule,
    UsersModule,
    ShopsModule,
    ProductsModule,
    CategoriesModule,
    CollectionsModule,
    SubscriptionsModule,
    ImagesModule,
    CataloguesModule,
    TemplatesModule,
    PdfModule,
    QrCodesModule,
    AnalyticsModule,
    PublicModule,
    NotificationsModule,
    AdminModule,
  ],
})
export class AppModule {}
