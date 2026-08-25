import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class ImagePosition {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsInt()
  position: number;
}

export class ReorderImagesDto {
  @ApiProperty({ type: [ImagePosition] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagePosition)
  images: ImagePosition[];
}
