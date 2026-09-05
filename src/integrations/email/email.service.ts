import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from '../../common/constants/injection-tokens';
import { EmailProvider } from './interfaces/email-provider.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private appUrl: string;

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendEmail(options: { to: string; subject: string; html: string; from?: string }): Promise<void> {
    await this.emailProvider.send(options);
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const link = `${this.appUrl}/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Katalog, ${name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
      </div>
    `;
    await this.emailProvider.send({ to, subject: 'Verify your Katalog email', html });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const link = `${this.appUrl}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset, ${name}</h2>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    await this.emailProvider.send({ to, subject: 'Reset your Katalog password', html });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Katalog, ${name}!</h2>
        <p>We're excited to have you on board. Start setting up your shop today!</p>
      </div>
    `;
    await this.emailProvider.send({ to, subject: 'Welcome to Katalog!', html });
  }

  async sendPaymentConfirmation(to: string, name: string, amount: number, currency: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Payment Confirmation</h2>
        <p>Hi ${name},</p>
        <p>We have successfully received your payment of ${amount} ${currency}.</p>
        <p>Thank you for your business!</p>
      </div>
    `;
    await this.emailProvider.send({ to, subject: 'Payment Received - Katalog', html });
  }

  async sendSubscriptionEmail(to: string, name: string, planName: string, status: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Subscription Update</h2>
        <p>Hi ${name},</p>
        <p>Your subscription to the ${planName} plan is now <strong>${status}</strong>.</p>
      </div>
    `;
    await this.emailProvider.send({ to, subject: 'Subscription Update - Katalog', html });
  }

  async sendDisputeNotification(adminEmail: string, disputeData: any): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Dispute Notification</h2>
        <p>A new dispute has been opened.</p>
        <pre>${JSON.stringify(disputeData, null, 2)}</pre>
      </div>
    `;
    await this.emailProvider.send({ to: adminEmail, subject: 'ACTION REQUIRED: Payment Dispute', html });
  }

  async sendModerationAlert(adminEmail: string, productData: any): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Product Moderation Alert</h2>
        <p>A product has flagged moderation rules.</p>
        <pre>${JSON.stringify(productData, null, 2)}</pre>
      </div>
    `;
    await this.emailProvider.send({ to: adminEmail, subject: 'Product Moderation Alert', html });
  }
}
