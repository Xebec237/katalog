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

  constructor(partial: any) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
