import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomBytes } from 'crypto';

import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { OrganizationBranding } from './entities/organization-branding.entity';
import { User } from '../auth/entities/user.entity';
import { License } from '../licenses/entities/license.entity';
import { Role } from '../rbac/entities/role.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AUDIT_ACTIONS, NOTIFICATION_TEMPLATES, REDIS_KEYS } from '@zonvo/constants';
import { CacheService } from '../../redis/cache.service';

import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,

    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,

    @InjectRepository(OrganizationBranding)
    private readonly brandingRepository: Repository<OrganizationBranding>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(License)
    private readonly licenseRepository: Repository<License>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  // ─── Create Organization ──────────────────────────────────────────────────────

  async create(dto: CreateOrganizationDto, creatorId: string): Promise<Organization> {
    let slug = dto.slug ?? this.slugify(dto.name);

    const existing = await this.orgRepository.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${randomBytes(3).toString('hex')}`;
    }

    const starterLicense = await this.licenseRepository.findOne({ where: { slug: 'starter' } });
    if (!starterLicense) throw new BadRequestException('Default starter license not configured — run migrations first');

    const adminRole = await this.resolveRole('org_admin');

    const org = await this.dataSource.transaction(async (manager) => {
      const newOrg = manager.create(Organization, {
        name: dto.name,
        slug,
        ownerId: creatorId,
        licenseId: starterLicense.id,
      });
      const savedOrg = (await manager.save(Organization, newOrg)) as Organization;

      await manager.save(OrganizationMember, {
        orgId: savedOrg.id,
        userId: creatorId,
        roleId: adminRole.id,
        invitedBy: null,
      });

      await manager.save(OrganizationBranding, {
        organizationId: savedOrg.id,
        primaryColor: '#7C3AED',
        secondaryColor: '#3B82F6',
        accentColor: '#10B981',
      });

      return savedOrg;
    }) as Organization;

    await this.auditService.log({
      action: AUDIT_ACTIONS.ORG_CREATED,
      resourceType: 'organization',
      resourceId: org.id,
      actorId: creatorId,
      orgId: org.id,
      metadata: { name: org.name, slug: org.slug },
    });

    return org;
  }

  // ─── Get Organization ─────────────────────────────────────────────────────────

  async findById(id: string, requesterId: string): Promise<Organization> {
    await this.assertMembership(id, requesterId);

    const org = await this.orgRepository.findOne({
      where: { id },
      relations: ['branding'],
    });

    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // ─── Update Organization ──────────────────────────────────────────────────────

  async update(id: string, dto: UpdateOrganizationDto, actorId: string): Promise<Organization> {
    await this.assertAdminRole(id, actorId);

    const org = await this.orgRepository.findOneOrFail({ where: { id } });
    const before = { name: org.name };

    Object.assign(org, {
      ...(dto.name !== undefined && { name: dto.name }),
    });

    const updated = await this.orgRepository.save(org);

    await this.auditService.log({
      action: AUDIT_ACTIONS.ORG_UPDATED,
      resourceType: 'organization',
      resourceId: id,
      actorId,
      orgId: id,
      beforeState: before,
      afterState: dto,
    });

    return updated;
  }

  // ─── List Members ─────────────────────────────────────────────────────────────

  async listMembers(
    orgId: string,
    requesterId: string,
    page: number,
    limit: number,
  ): Promise<{ members: OrganizationMember[]; total: number }> {
    await this.assertMembership(orgId, requesterId);

    const [members, total] = await this.memberRepository.findAndCount({
      where: { orgId },
      relations: ['user', 'role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { joinedAt: 'ASC' },
    });

    return { members, total };
  }

  // ─── Invite Member ────────────────────────────────────────────────────────────

  async inviteMember(orgId: string, dto: InviteMemberDto, inviterId: string): Promise<{ message: string }> {
    await this.assertAdminRole(orgId, inviterId);

    const org = await this.orgRepository.findOneOrFail({ where: { id: orgId } });

    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (user) {
      const existing = await this.memberRepository.findOne({ where: { orgId, userId: user.id } });
      if (existing) throw new ConflictException('User is already a member of this organization');
    }

    const token = randomBytes(32).toString('hex');
    const tokenKey = REDIS_KEYS.ORG_INVITE_TOKEN(token);
    await this.cacheService.set(
      tokenKey,
      JSON.stringify({ orgId, email: dto.email, role: dto.role, inviterId }),
      86400,
    );

    await this.notificationsService.queue(
      'email',
      dto.email,
      NOTIFICATION_TEMPLATES.MEMBER_INVITED,
      { orgName: org.name, inviteToken: token, role: dto.role },
      { userId: inviterId, orgId: orgId },
    );

    await this.auditService.log({
      action: AUDIT_ACTIONS.ORG_MEMBER_INVITED,
      resourceType: 'organization',
      resourceId: orgId,
      actorId: inviterId,
      orgId: orgId,
      metadata: { invitedEmail: dto.email, role: dto.role },
    });

    return { message: 'Invitation sent' };
  }

  // ─── Accept Invitation ────────────────────────────────────────────────────────

  async acceptInvitation(token: string, userId: string): Promise<Organization> {
    const tokenKey = REDIS_KEYS.ORG_INVITE_TOKEN(token);
    const raw = await this.cacheService.get<string>(tokenKey);
    if (!raw) throw new BadRequestException('Invitation token is invalid or expired');

    const { orgId, role } = JSON.parse(raw) as { orgId: string; email: string; role: string; inviterId: string };

    const org = await this.orgRepository.findOneOrFail({ where: { id: orgId } });
    const resolvedRole = await this.resolveRole(role);

    const existing = await this.memberRepository.findOne({ where: { orgId, userId } });
    if (!existing) {
      await this.memberRepository.save({ orgId, userId, roleId: resolvedRole.id, invitedBy: null });
    }

    await this.cacheService.del(tokenKey);

    await this.auditService.log({
      action: AUDIT_ACTIONS.ORG_MEMBER_JOINED,
      resourceType: 'organization',
      resourceId: orgId,
      actorId: userId,
      orgId: orgId,
    });

    return org;
  }

  // ─── Update Member Role ───────────────────────────────────────────────────────

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    actorId: string,
  ): Promise<void> {
    await this.assertAdminRole(orgId, actorId);

    const org = await this.orgRepository.findOneOrFail({ where: { id: orgId } });
    if (org.ownerId === targetUserId) throw new ForbiddenException('Cannot change the role of the organization owner');

    const member = await this.memberRepository.findOne({ where: { orgId, userId: targetUserId } });
    if (!member) throw new NotFoundException('Member not found');

    const newRole = await this.resolveRole(dto.role);
    await this.memberRepository.update({ id: member.id }, { roleId: newRole.id });

    await this.auditService.log({
      action: AUDIT_ACTIONS.ORG_MEMBER_ROLE_CHANGED,
      resourceType: 'organization',
      resourceId: orgId,
      actorId,
      orgId: orgId,
      metadata: { targetUserId, newRole: dto.role },
    });
  }

  // ─── Remove Member ────────────────────────────────────────────────────────────

  async removeMember(orgId: string, targetUserId: string, actorId: string): Promise<void> {
    await this.assertAdminRole(orgId, actorId);

    const org = await this.orgRepository.findOneOrFail({ where: { id: orgId } });
    if (org.ownerId === targetUserId) throw new ForbiddenException('Cannot remove the organization owner');

    const member = await this.memberRepository.findOne({ where: { orgId, userId: targetUserId } });
    if (!member) throw new NotFoundException('Member not found');

    await this.memberRepository.delete({ id: member.id });

    await this.auditService.log({
      action: AUDIT_ACTIONS.ORG_MEMBER_REMOVED,
      resourceType: 'organization',
      resourceId: orgId,
      actorId,
      orgId: orgId,
      metadata: { removedUserId: targetUserId },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 63);
  }

  private async resolveRole(slug: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { slug } });
    if (!role) throw new NotFoundException(`Role '${slug}' not found — run migrations first`);
    return role;
  }

  private async assertMembership(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({ where: { orgId, userId } });
    if (!member) throw new ForbiddenException('You are not a member of this organization');
  }

  private async assertAdminRole(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { orgId, userId },
      relations: ['role'],
    });

    const adminSlugs = ['org_admin', 'platform_admin', 'super_admin'];
    if (!member || !adminSlugs.includes(member.role?.slug ?? '')) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
  }
}
