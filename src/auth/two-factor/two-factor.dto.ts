import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class Setup2FaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  secret: string;
}

export class Verify2FaDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class Validate2FaDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string; // Can be TOTP or backup code
}
