import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  async getUsers(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getUsers({ page, limit });
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'User detail' })
  async getUser(@Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Change user role' })
  async updateUserRole(
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserRole(targetUserId, role, adminId);
  }

  @Get('shops')
  @ApiOperation({ summary: 'List shops' })
  async getShops(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getShops({ page, limit });
  }

  @Get('products')
  @ApiOperation({ summary: 'List products' })
  async getProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getProducts({ page, limit, status });
  }

  @Patch('products/:productId/moderate')
  @ApiOperation({ summary: 'Moderate product' })
  async moderateProduct(
    @Param('productId') productId: string,
    @Body('action') action: 'approve' | 'reject',
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.moderateProduct(productId, action, adminId);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions' })
  async getSubscriptions(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getSubscriptions({ page, limit });
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments' })
  async getPayments(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getPayments({ page, limit });
  }

  @Get('reserved-slugs')
  @ApiOperation({ summary: 'List reserved slugs' })
  async getReservedSlugs() {
    return this.adminService.getReservedSlugs();
  }

  @Post('reserved-slugs')
  @ApiOperation({ summary: 'Add reserved slug' })
  async addReservedSlug(@Body('slug') slug: string, @Body('reason') reason: string) {
    return this.adminService.addReservedSlug(slug, reason);
  }

  @Delete('reserved-slugs/:id')
  @ApiOperation({ summary: 'Remove reserved slug' })
  async removeReservedSlug(@Param('id') id: string) {
    return this.adminService.removeReservedSlug(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit logs' })
  async getAuditLogs(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getAuditLogs({ page, limit });
  }
}
