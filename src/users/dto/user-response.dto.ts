import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  name: string | null;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional()
  emailVerifiedAt: Date | null;

  @ApiProperty()
  twoFactorEnabled: boolean;

  @ApiProperty()
  locale: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude()
  passwordHash?: string | null;

  @Exclude()
  twoFactorSecret?: string | null;

  @Exclude()
  backupCodes?: string[];

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
