import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '@/common/guards/shop-access.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/pagination/pagination.dto';

@ApiTags('shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shop' })
  create(@Body() createShopDto: CreateShopDto, @CurrentUser() user: any) {
    return this.shopsService.create(createShopDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List user shops' })
  findUserShops(@CurrentUser() user: any, @Query() paginationDto: PaginationDto) {
    return this.shopsService.findUserShops(user.id, paginationDto);
  }

  @Get(':shopId')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Get shop details' })
  findById(@Param('shopId') id: string) {
    return this.shopsService.findById(id);
  }

  @Patch(':shopId')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Update shop' })
  update(@Param('shopId') id: string, @Body() updateShopDto: UpdateShopDto) {
    return this.shopsService.update(id, updateShopDto);
  }

  @Delete(':shopId')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Soft delete shop' })
  softDelete(@Param('shopId') id: string) {
    return this.shopsService.softDelete(id);
  }

  @Post(':shopId/members')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Add a member to the shop' })
  addMember(@Param('shopId') shopId: string, @Body() addMemberDto: AddMemberDto) {
    return this.shopsService.addMember(shopId, addMemberDto);
  }

  @Get(':shopId/members')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'List shop members' })
  getMembers(@Param('shopId') shopId: string, @Query() paginationDto: PaginationDto) {
    return this.shopsService.getMembers(shopId, paginationDto);
  }

  @Delete(':shopId/members/:memberId')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Remove a member from the shop' })
  removeMember(@Param('shopId') shopId: string, @Param('memberId') memberId: string) {
    return this.shopsService.removeMember(shopId, memberId);
  }

  @Get(':shopId/settings')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Get shop settings' })
  getSettings(@Param('shopId') shopId: string) {
    return this.shopsService.getSettings(shopId);
  }

  @Patch(':shopId/settings')
  @UseGuards(ShopAccessGuard)
  @ApiOperation({ summary: 'Update shop settings' })
  updateSettings(@Param('shopId') shopId: string, @Body() updateSettingsDto: UpdateSettingsDto) {
    return this.shopsService.updateSettings(shopId, updateSettingsDto);
  }
}
