import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Templates')
@Controller()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Public()
  @Get('api/templates')
  @ApiOperation({ summary: 'List active templates' })
  async findAll() {
    const templates = await this.templatesService.findAllActive();
    return templates.map(t => new TemplateResponseDto(t));
  }

  @Public()
  @Get('api/templates/:templateId')
  @ApiOperation({ summary: 'Get template detail' })
  async findOne(@Param('templateId') templateId: string) {
    const template = await this.templatesService.findOne(templateId);
    return new TemplateResponseDto(template);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Post('api/admin/templates')
  @ApiOperation({ summary: 'Create template (admin only)' })
  async create(@Body() dto: CreateTemplateDto, @CurrentUser('id') userId: string) {
    const template = await this.templatesService.create(dto, userId);
    return new TemplateResponseDto(template);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Patch('api/admin/templates/:templateId')
  @ApiOperation({ summary: 'Update template (admin only)' })
  async update(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    const template = await this.templatesService.update(templateId, dto, userId);
    return new TemplateResponseDto(template);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Delete('api/admin/templates/:templateId')
  @ApiOperation({ summary: 'Delete template (admin only)' })
  async remove(@Param('templateId') templateId: string, @CurrentUser('id') userId: string) {
    await this.templatesService.remove(templateId, userId);
    return { success: true };
  }
}
