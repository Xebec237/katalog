import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'token-uuid' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
