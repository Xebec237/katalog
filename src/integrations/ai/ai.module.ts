import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from '@/common/constants/injection-tokens';
import { AiService } from './ai.service';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { PrismaModule } from '@/prisma/prisma.module';

@Global()
@Module({})
export class AiModule {
  static forRootAsync(): DynamicModule {
    return {
      module: AiModule,
      imports: [ConfigModule, PrismaModule],
      providers: [
        {
          provide: AI_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<string>('AI_PROVIDER', 'openai');
            if (provider === 'openai') {
              return new OpenAIAdapter(configService);
            }
            throw new Error(`Unsupported AI provider: ${provider}`);
          },
          inject: [ConfigService],
        },
        AiService,
      ],
      exports: [AiService, AI_PROVIDER],
    };
  }
}

export { AiModule as AIModule };
