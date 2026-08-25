import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty()
  user: UserResponseDto;

  @ApiProperty()
  accessToken: string;
}
