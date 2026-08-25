import { ApiProperty } from '@nestjs/swagger';

export class ImageJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  createdAt: Date;
  
  constructor(partial: Partial<ImageJobResponseDto>) {
    Object.assign(this, partial);
  }
}
