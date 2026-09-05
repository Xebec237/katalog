import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../integrations/storage/storage.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { NotificationType } from '@prisma/client';

@Processor('pdf-generation')
export class PdfProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    const { catalogueId, shopId, userId } = job.data;
    await job.updateProgress(10);

    const catalogue = await this.prisma.catalogue.findUnique({
      where: { id: catalogueId },
      include: {
        shop: {
          include: {
            products: {
              where: { status: 'ACTIVE' },
              include: { images: true }
            }
          }
        }
      }
    });

    if (!catalogue) throw new Error('Catalogue not found');
    await job.updateProgress(30);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    page.drawText(catalogue.shop.name, {
      x: 50,
      y: height - 50,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });

    let yOffset = height - 100;
    for (const product of catalogue.shop.products.slice(0, 10)) { // simplify logic for now
      page.drawText(`${product.name} - ${product.price} ${product.currency}`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
      });
      yOffset -= 20;
    }

    await job.updateProgress(70);

    const pdfBytes = await pdfDoc.save();
    const key = `shops/${shopId}/catalogues/${catalogueId}/katalog-${Date.now()}.pdf`;
    
    const pdfUrl = await this.storageService.uploadFile(
      Buffer.from(pdfBytes),
      key,
      'application/pdf'
    );

    await this.prisma.catalogue.update({
      where: { id: catalogueId },
      data: { pdfUrl },
    });

    // Notify user
    await this.prisma.notification.create({
      data: {
        userId,
        shopId,
        type: NotificationType.PDF_READY,
        title: 'PDF généré avec succès',
        body: 'Le PDF de votre catalogue est prêt à être téléchargé.',
        data: { catalogueId, pdfUrl },
      }
    });

    await job.updateProgress(100);
    return { pdfUrl };
  }
}
