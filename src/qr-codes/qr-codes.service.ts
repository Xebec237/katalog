import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/integrations/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import * as qrcode from 'qrcode';

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async generate(shopId: string, catalogueId: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { id: catalogueId, shopId },
    });

    if (!catalogue) throw new NotFoundException('Catalogue not found');
    if (!catalogue.published || !catalogue.publicSlug) {
      throw new BadRequestException('Catalogue must be published to generate a QR code');
    }

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'https://katalog.cm';
    const targetUrl = `${baseUrl}/c/${catalogue.publicSlug}`;

    const buffer = await qrcode.toBuffer(targetUrl, {
      type: 'png',
      width: 500,
      margin: 2,
    });

    const key = `shops/${shopId}/qr-codes/${catalogueId}-${Date.now()}.png`;
    const imageUrl = await this.storageService.uploadFile(buffer, key, 'image/png');

    return this.prisma.qrCode.create({
      data: {
        shopId,
        catalogueId,
        targetUrl,
        imageUrl,
      },
    });
  }

  async findAll(shopId: string) {
    return this.prisma.qrCode.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: { catalogue: { select: { publicSlug: true } } },
    });
  }
}
