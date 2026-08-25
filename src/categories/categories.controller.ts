import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '@/common/guards/shop-access.guard';
import { ShopId } from '@/common/decorators/shop-id.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('api/categories/global')
  @Public()
  @ApiOperation({ summary: 'List global categories' })
  getGlobalCategories() {
    return this.categoriesService.findGlobalCategories();
  }

  @Post('api/shops/:shopId/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  @ApiOperation({ summary: 'Create a category' })
  create(@ShopId() shopId: string, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(shopId, createCategoryDto);
  }

  @Get('api/shops/:shopId/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  @ApiOperation({ summary: 'List shop categories (including global) as tree' })
  findByShop(@ShopId() shopId: string) {
    return this.categoriesService.findByShop(shopId);
  }

  @Get('api/shops/:shopId/categories/:categoryId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  @ApiOperation({ summary: 'Get category details' })
  findById(@ShopId() shopId: string, @Param('categoryId') categoryId: string) {
    return this.categoriesService.findById(shopId, categoryId);
  }

  @Patch('api/shops/:shopId/categories/:categoryId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  @ApiOperation({ summary: 'Update category' })
  update(@ShopId() shopId: string, @Param('categoryId') categoryId: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(shopId, categoryId, updateCategoryDto);
  }

  @Delete('api/shops/:shopId/categories/:categoryId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ShopAccessGuard)
  @ApiOperation({ summary: 'Delete category' })
  remove(@ShopId() shopId: string, @Param('categoryId') categoryId: string) {
    return this.categoriesService.delete(shopId, categoryId);
  }
}
