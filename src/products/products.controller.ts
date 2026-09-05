import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ShopAccessGuard } from '../common/guards/shop-access.guard';
import { ShopId } from '../common/decorators/shop-id.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductStatus } from '@prisma/client';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ShopAccessGuard)
@Controller('api/shops/:shopId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  create(@ShopId() shopId: string, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(shopId, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  findAll(@ShopId() shopId: string, @Query() filterDto: ProductFilterDto) {
    return this.productsService.findAll(shopId, filterDto);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get product details' })
  findById(@ShopId() shopId: string, @Param('productId') productId: string) {
    return this.productsService.findById(shopId, productId);
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Update product' })
  update(@ShopId() shopId: string, @Param('productId') productId: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(shopId, productId, updateProductDto);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Soft delete product' })
  softDelete(@ShopId() shopId: string, @Param('productId') productId: string) {
    return this.productsService.softDelete(shopId, productId);
  }

  @Patch(':productId/status')
  @ApiOperation({ summary: 'Change product status' })
  changeStatus(@ShopId() shopId: string, @Param('productId') productId: string, @Body('status') status: ProductStatus) {
    return this.productsService.changeStatus(shopId, productId, status);
  }

  @Post(':productId/images')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload product image' })
  addImage(@ShopId() shopId: string, @Param('productId') productId: string, @UploadedFile() file: Express.Multer.File) {
    return this.productsService.addImage(shopId, productId, file);
  }

  @Delete(':productId/images/:imageId')
  @ApiOperation({ summary: 'Delete product image' })
  removeImage(@ShopId() shopId: string, @Param('productId') productId: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(shopId, productId, imageId);
  }

  @Patch(':productId/images/reorder')
  @ApiOperation({ summary: 'Reorder product images' })
  reorderImages(@ShopId() shopId: string, @Param('productId') productId: string, @Body() reorderDto: ReorderImagesDto) {
    return this.productsService.reorderImages(shopId, productId, reorderDto);
  }
}
