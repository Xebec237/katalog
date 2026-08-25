import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsResponseDto {
  @ApiProperty()
  CATALOG_VIEW: number;

  @ApiProperty()
  PRODUCT_VIEW: number;

  @ApiProperty()
  WHATSAPP_CLICK: number;
  
  @ApiProperty()
  PHONE_CLICK: number;

  @ApiProperty()
  PDF_DOWNLOAD: number;

  @ApiProperty()
  QR_SCAN: number;
}
