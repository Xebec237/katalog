import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QrCodesService } from './qr-codes.service';
import { ShopAccessGuard } from '../common/guards/shop-access.guard';

@ApiTags('QR Codes')
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller('api/shops/:shopId')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post('catalogues/:catalogueId/qr-code')
  @ApiOperation({ summary: 'Generate QR code' })
  async generate(
    @Param('shopId') shopId: string,
    @Param('catalogueId') catalogueId: string,
  ) {
    const qrCode = await this.qrCodesService.generate(shopId, catalogueId);
    return qrCode;
  }

  @Get('qr-codes')
  @ApiOperation({ summary: 'List QR codes' })
  async findAll(@Param('shopId') shopId: string) {
    return this.qrCodesService.findAll(shopId);
  }
}
