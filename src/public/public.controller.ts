import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Public')
@Controller('api/public/catalogues/:slug')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get full public catalogue' })
  async getCatalogue(@Param('slug') slug: string) {
    return this.publicService.getCatalogue(slug);
  }

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'List paginated products for catalogue' })
  async getProducts(
    @Param('slug') slug: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.publicService.getProducts(slug, { page, limit, categoryId });
  }

  @Public()
  @Get('products/:productSlug')
  @ApiOperation({ summary: 'Get single product detail' })
  async getProduct(@Param('slug') slug: string, @Param('productSlug') productSlug: string) {
    return this.publicService.getProduct(slug, productSlug);
  }

  @Public()
  @Get('seo')
  @ApiOperation({ summary: 'Get SEO metadata' })
  async getSeo(@Param('slug') slug: string) {
    return this.publicService.getSeoMetadata(slug);
  }
}
