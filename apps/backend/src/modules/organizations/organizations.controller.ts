import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/organization.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgsService.create(dto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgsService.findById(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (Org Admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgsService.update(id, dto, user.userId);
  }

  // ─── Members ─────────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.orgsService.listMembers(id, user.userId, page, Math.min(limit, 100));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite a member (Org Admin)' })
  async inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgsService.inviteMember(id, dto, user.userId);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Change member role (Org Admin)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.orgsService.updateMemberRole(id, userId, dto, user.userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member (Org Admin)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.orgsService.removeMember(id, userId, user.userId);
  }
}

// ─── Accept Invitation (Public) ───────────────────────────────────────────────

@ApiTags('Organizations')
@Controller('auth')
export class AcceptInvitationController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Public()
  @Post('accept-invitation')
  @ApiOperation({ summary: 'Accept an organization invitation' })
  async accept(
    @Body('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgsService.acceptInvitation(token, user.userId);
  }
}
