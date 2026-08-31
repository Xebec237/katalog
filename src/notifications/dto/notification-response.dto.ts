import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  data?: any;

  @ApiProperty()
  readAt?: Date;

  @ApiProperty()
  createdAt: Date;

  constructor(partial: any) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
