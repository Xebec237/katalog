import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatalogueDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateId?: string;
}
