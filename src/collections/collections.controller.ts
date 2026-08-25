import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddProductsDto } from './dto/add-products.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '@/common/guards/shop-access.guard';
import { ShopId } from '@/common/decorators/shop-id.decorator';
import { PaginationDto } from '@/common/pagination/pagination.dto';

@ApiTags('collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ShopAccessGuard)
@Controller('api/shops/:shopId/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create collection' })
  create(@ShopId() shopId: string, @Body() createCollectionDto: CreateCollectionDto) {
    return this.collectionsService.create(shopId, createCollectionDto);
  }

  @Get()
  @ApiOperation({ summary: 'List collections' })
  findAll(@ShopId() shopId: string, @Query() paginationDto: PaginationDto) {
    return this.collectionsService.findAll(shopId, paginationDto);
  }

  @Get(':collectionId')
  @ApiOperation({ summary: 'Get collection details' })
  findById(@ShopId() shopId: string, @Param('collectionId') collectionId: string) {
    return this.collectionsService.findById(shopId, collectionId);
  }

  @Patch(':collectionId')
  @ApiOperation({ summary: 'Update collection' })
  update(@ShopId() shopId: string, @Param('collectionId') collectionId: string, @Body() updateCollectionDto: UpdateCollectionDto) {
    return this.collectionsService.update(shopId, collectionId, updateCollectionDto);
  }

  @Delete(':collectionId')
  @ApiOperation({ summary: 'Delete collection' })
  remove(@ShopId() shopId: string, @Param('collectionId') collectionId: string) {
    return this.collectionsService.remove(shopId, collectionId);
  }

  @Post(':collectionId/products')
  @ApiOperation({ summary: 'Add products to collection' })
  addProducts(@ShopId() shopId: string, @Param('collectionId') collectionId: string, @Body() dto: AddProductsDto) {
    return this.collectionsService.addProducts(shopId, collectionId, dto.productIds);
  }

  @Delete(':collectionId/products/:productId')
  @ApiOperation({ summary: 'Remove product from collection' })
  removeProduct(@ShopId() shopId: string, @Param('collectionId') collectionId: string, @Param('productId') productId: string) {
    return this.collectionsService.removeProduct(shopId, collectionId, productId);
  }
}
