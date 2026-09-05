import { Controller, Get, Patch, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users') // Typically base path is handled, but asked for /users endpoints
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    const fullUser = await this.usersService.findById(user.id);
    return new UserResponseDto(fullUser);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(user.id, updateUserDto);
    return new UserResponseDto(updatedUser);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Soft delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.usersService.softDelete(user.id);
    return { message: 'Account successfully deleted' };
  }
}
