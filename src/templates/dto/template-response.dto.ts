import { ApiProperty } from '@nestjs/swagger';

export class TemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  previewUrl?: string;

  @ApiProperty()
  configuration: any;

  @ApiProperty()
  active: boolean;

  constructor(partial: Partial<TemplateResponseDto>) {
    Object.assign(this, partial);
  }
}
