import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { Verify2FaDto, Validate2FaDto } from './two-factor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('auth/2fa')
@ApiBearerAuth()
@Controller('api/auth/2fa')
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('setup')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 201 })
  async setup(@CurrentUser() user: User) {
    const result = await this.twoFactorService.generateSecret(user.email, user.id);
    return {
      qrCodeDataUrl: result.qrCodeDataUrl,
      // We do not return the raw secret in production to the frontend unless necessary
    };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify code and enable 2FA' })
  @ApiResponse({ status: 200 })
  async verify(@CurrentUser() user: User, @Body() dto: Verify2FaDto) {
    const isValid = await this.twoFactorService.verifyCode(user.id, dto.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    
    const backupCodes = await this.twoFactorService.generateBackupCodes(user.id);
    
    return { 
      message: '2FA enabled successfully',
      backupCodes 
    };
  }

  @Post('backup-codes')
  @ApiOperation({ summary: 'Generate new backup codes' })
  @ApiResponse({ status: 201 })
  async generateBackupCodes(@CurrentUser() user: User) {
    if (!user.twoFactorEnabled) {
      throw new UnauthorizedException('2FA is not enabled');
    }
    const codes = await this.twoFactorService.generateBackupCodes(user.id);
    return { backupCodes: codes };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200 })
  async disable(@CurrentUser() user: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: []
      },
    });
    return { message: '2FA disabled successfully' };
  }
}
