import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from '../../common/constants/injection-tokens';
import { EmailService } from './email.service';
import { ResendAdapter } from './adapters/resend.adapter';

@Global()
@Module({})
export class EmailModule {
  static forRootAsync(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: EMAIL_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<string>('EMAIL_PROVIDER', 'resend');
            if (provider === 'resend') {
              return new ResendAdapter(configService);
            }
            throw new Error(`Unsupported email provider: ${provider}`);
          },
          inject: [ConfigService],
        },
        EmailService,
      ],
      exports: [EmailService, EMAIL_PROVIDER],
    };
  }
}
