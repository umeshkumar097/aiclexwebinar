import {
  Controller,
  Post,
  Get,
  Put,
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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
    @Query('license') license?: string,
  ) {
    return this.adminService.listUsers(page, Math.min(limit, 100), search, status, license);
  }

  @Post('users')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  async createUser(
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName?: string;
      phone?: string;
      status?: string;
      timezone?: string;
    },
  ) {
    return this.adminService.createUser(body);
  }

  // IMPORTANT: bulk-status MUST come before /:id to avoid routing conflicts
  @Post('users/bulk-status')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update user statuses' })
  async bulkUpdateStatus(
    @Body() body: { ids: string[]; status: string },
  ) {
    return this.adminService.bulkUpdateStatus(body.ids, body.status);
  }

  @Get('users/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user details' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      timezone?: string;
    },
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Delete('users/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a user (anonymize)' })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  // ─── Invitations ──────────────────────────────────────────────────────────

  @Post('invitations')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send user invitation' })
  async createInvitation(
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName?: string;
      roleSlug?: string;
      licenseId?: string;
    },
  ) {
    return this.adminService.createInvitation(body);
  }

  @Get('invitations')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all invitations' })
  async listInvitations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.listInvitations(page, Math.min(limit, 100), status);
  }

  @Post('invitations/:id/resend')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invitation email' })
  async resendInvitation(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.resendInvitation(id);
  }

  @Delete('invitations/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an invitation' })
  async cancelInvitation(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.cancelInvitation(id);
  }

  // ─── Licenses ─────────────────────────────────────────────────────────────

  @Get('licenses')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all licenses' })
  async listLicenses() {
    return this.adminService.listLicenses();
  }

  @Get('licenses/assignments')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List license assignments' })
  async listLicenseAssignments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.listLicenseAssignments(page, Math.min(limit, 100), search);
  }

  @Get('licenses/history')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'License assignment history' })
  async getLicenseHistory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getLicenseHistory(page, Math.min(limit, 100));
  }

  @Post('licenses/assign')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a license to a user' })
  async assignLicense(
    @Body() body: { userId: string; licenseId: string; expiresAt?: string },
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    return this.adminService.assignLicense(body.userId, body.licenseId, expiresAt);
  }

  @Post('licenses/remove')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a license from a user' })
  async removeLicense(@Body() body: { userId: string }) {
    return this.adminService.removeLicense(body.userId);
  }

  @Post('licenses/transfer')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer a license from one user to another' })
  async transferLicense(
    @Body() body: { fromUserId: string; toUserId: string },
  ) {
    return this.adminService.transferLicense(body.fromUserId, body.toUserId);
  }

  // ─── Roles & Permissions ──────────────────────────────────────────────────

  @Get('roles')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all roles with permissions' })
  async listRoles() {
    return this.adminService.listRoles();
  }

  @Get('permissions')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all permissions' })
  async listPermissions() {
    return this.adminService.listPermissions();
  }

  @Put('roles/:id/permissions')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update permissions for a role' })
  async updateRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.adminService.updateRolePermissions(id, body.permissionIds);
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────

  @Get('activity')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Recent activity / audit logs' })
  async getActivity(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.adminService.getActivityLogs(page, Math.min(limit, 100), action, actorId);
  }

  // ─── Email Logs ───────────────────────────────────────────────────────────

  @Get('email-logs')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List email notification logs' })
  async getEmailLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getEmailLogs(page, Math.min(limit, 100), search, status);
  }

  // ─── Webinars ─────────────────────────────────────────────────────────────

  @Get('webinars')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all webinars' })
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
  @ApiOperation({ summary: 'Get webinar details' })
  async getWebinar(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getWebinar(id);
  }

  @Delete('webinars/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webinar' })
  async deleteWebinar(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteWebinar(id);
  }
}
