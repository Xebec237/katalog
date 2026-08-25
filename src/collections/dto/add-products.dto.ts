import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AddProductsDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}
