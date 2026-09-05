import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { ShopAccessGuard } from '../common/guards/shop-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('PDF')
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller('api/shops/:shopId')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('catalogues/:catalogueId/pdf')
  @ApiOperation({ summary: 'Generate PDF for a catalogue' })
  async generatePdf(
    @Param('shopId') shopId: string,
    @Param('catalogueId') catalogueId: string,
    @CurrentUser('id') userId: string,
  ) {
    const job = await this.pdfService.generatePdf(catalogueId, shopId, userId);
    return { jobId: job.id, message: 'PDF generation started' };
  }

  @Get('pdf/:jobId/status')
  @ApiOperation({ summary: 'Check PDF generation status' })
  async getStatus(@Param('shopId') shopId: string, @Param('jobId') jobId: string) {
    const status = await this.pdfService.getJobStatus(jobId);
    return status;
  }
}
