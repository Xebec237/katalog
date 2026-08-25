import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CataloguesService } from './catalogues.service';
import { CreateCatalogueDto } from './dto/create-catalogue.dto';
import { UpdateCatalogueDto } from './dto/update-catalogue.dto';
import { CatalogueResponseDto } from './dto/catalogue-response.dto';
import { ShopAccessGuard } from '@/common/guards/shop-access.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Catalogues')
@ApiBearerAuth()
@UseGuards(ShopAccessGuard)
@Controller('api/shops/:shopId/catalogues')
export class CataloguesController {
  constructor(private readonly cataloguesService: CataloguesService) {}

  @Post()
  @ApiOperation({ summary: 'Create catalogue' })
  async create(
    @Param('shopId') shopId: string,
    @Body() dto: CreateCatalogueDto,
    @CurrentUser('id') userId: string,
  ) {
    const cat = await this.cataloguesService.create(shopId, dto, userId);
    return new CatalogueResponseDto(cat);
  }

  @Get()
  @ApiOperation({ summary: 'List catalogues' })
  async findAll(
    @Param('shopId') shopId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const [data, total] = await this.cataloguesService.findAll(shopId, { page, limit });
    return {
      data: data.map(c => new CatalogueResponseDto(c)),
      meta: { total, page, limit },
    };
  }

  @Get(':catalogueId')
  @ApiOperation({ summary: 'Get catalogue detail' })
  async findOne(@Param('shopId') shopId: string, @Param('catalogueId') catalogueId: string) {
    const cat = await this.cataloguesService.findOne(shopId, catalogueId);
    return new CatalogueResponseDto(cat);
  }

  @Patch(':catalogueId')
  @ApiOperation({ summary: 'Update catalogue' })
  async update(
    @Param('shopId') shopId: string,
    @Param('catalogueId') catalogueId: string,
    @Body() dto: UpdateCatalogueDto,
    @CurrentUser('id') userId: string,
  ) {
    const cat = await this.cataloguesService.update(shopId, catalogueId, dto, userId);
    return new CatalogueResponseDto(cat);
  }

  @Delete(':catalogueId')
  @ApiOperation({ summary: 'Delete catalogue' })
  async remove(
    @Param('shopId') shopId: string,
    @Param('catalogueId') catalogueId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.cataloguesService.remove(shopId, catalogueId, userId);
    return { success: true };
  }

  @Post(':catalogueId/publish')
  @ApiOperation({ summary: 'Publish catalogue' })
  async publish(
    @Param('shopId') shopId: string,
    @Param('catalogueId') catalogueId: string,
    @CurrentUser('id') userId: string,
  ) {
    const cat = await this.cataloguesService.publish(shopId, catalogueId, userId);
    return new CatalogueResponseDto(cat);
  }

  @Post(':catalogueId/unpublish')
  @ApiOperation({ summary: 'Unpublish catalogue' })
  async unpublish(
    @Param('shopId') shopId: string,
    @Param('catalogueId') catalogueId: string,
    @CurrentUser('id') userId: string,
  ) {
    const cat = await this.cataloguesService.unpublish(shopId, catalogueId, userId);
    return new CatalogueResponseDto(cat);
  }
}
