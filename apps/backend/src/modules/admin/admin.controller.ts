import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin login' })
  async login(@Body() body: { email: string; password: string }) {
    const token = await this.adminService.adminLogin(body.email, body.password);
    return { token };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Platform-wide stats' })
  async stats() {
    return this.adminService.getStats();
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all users' })
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listUsers(page, Math.min(limit, 100), search, status);
  }

  @Get('users/:id')
  @UseGuards(AdminGuard)
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Delete('users/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  // ─── Webinars ─────────────────────────────────────────────────────────────

  @Get('webinars')
  @UseGuards(AdminGuard)
  async listWebinars(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listWebinars(page, Math.min(limit, 100), search, status);
  }

  @Get('webinars/:id')
  @UseGuards(AdminGuard)
  async getWebinar(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getWebinar(id);
  }

  @Delete('webinars/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteWebinar(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteWebinar(id);
  }

  // ─── Recent Activity ──────────────────────────────────────────────────────

  @Get('activity')
  @UseGuards(AdminGuard)
  async recentActivity() {
    return this.adminService.getRecentActivity();
  }
}
