import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsEventType } from '@prisma/client';

export class IngestEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  @IsNotEmpty()
  eventType: AnalyticsEventType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;
}
