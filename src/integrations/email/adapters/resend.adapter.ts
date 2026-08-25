import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailProvider } from '../interfaces/email-provider.interface';

export class ResendAdapter implements EmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('EMAIL_API_KEY');
    this.resend = new Resend(apiKey);
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM', 'noreply@katalog.app');
  }

  async send(options: { to: string; subject: string; html: string; from?: string }): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: options.from || this.defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      throw new Error(`Resend email error: ${error.message}`);
    }
  }
}
