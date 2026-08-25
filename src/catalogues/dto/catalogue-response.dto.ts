import { ApiProperty } from '@nestjs/swagger';

export class CatalogueResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  templateId?: string;

  @ApiProperty()
  published: boolean;

  @ApiProperty()
  publicSlug?: string;

  @ApiProperty()
  pdfUrl?: string;

  @ApiProperty()
  createdAt: Date;

  constructor(partial: Partial<CatalogueResponseDto>) {
    Object.assign(this, partial);
  }
}
