import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ShopMemberRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: ShopMemberRole, example: ShopMemberRole.EDITOR })
  @IsEnum(ShopMemberRole)
  @IsNotEmpty()
  role: ShopMemberRole;
}
