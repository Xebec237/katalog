import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  private get encryptionKey(): Buffer {
    const key = process.env.TWO_FA_ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
      throw new InternalServerErrorException('TWO_FA_ENCRYPTION_KEY must be exactly 32 bytes');
    }
    return Buffer.from(key, 'utf8');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new InternalServerErrorException('Invalid encrypted 2FA secret format');
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async generateSecret(userEmail: string, userId: string) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(userEmail, 'Katalog', secret);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.encrypt(secret) },
    });

    return {
      secret,
      qrCodeDataUrl: await qrcode.toDataURL(otpauthUrl),
    };
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return false;
    }

    const secret = this.decrypt(user.twoFactorSecret);
    return authenticator.verify({ token: code, secret });
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedCodes = await Promise.all(codes.map(c => argon2.hash(c)));
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes: hashedCodes },
    });

    return codes;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    for (let i = 0; i < user.backupCodes.length; i++) {
      const isMatch = await argon2.verify(user.backupCodes[i], code);
      if (isMatch) {
        // Remove used backup code
        const newBackupCodes = [...user.backupCodes];
        newBackupCodes.splice(i, 1);
        await this.prisma.user.update({
          where: { id: userId },
          data: { backupCodes: newBackupCodes },
        });
        return true;
      }
    }
    return false;
  }
}
