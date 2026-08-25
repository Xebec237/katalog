import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from '@/common/constants/injection-tokens';
import { StorageService } from './storage.service';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';

@Global()
@Module({})
export class StorageModule {
  static forRootAsync(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<string>('STORAGE_PROVIDER', 's3');
            if (provider === 's3' || provider === 'r2') {
              return new S3StorageAdapter(configService);
            }
            throw new Error(`Unsupported storage provider: ${provider}`);
          },
          inject: [ConfigService],
        },
        StorageService,
      ],
      exports: [StorageService, STORAGE_PROVIDER],
    };
  }
}
