import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import * as crypto from 'crypto';

import { User, UserStatus } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Webinar } from '../webinars/entities/webinar.entity';
import { License } from '../licenses/entities/license.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Role } from '../rbac/entities/role.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { RolePermission } from '../rbac/entities/role-permission.entity';
import { NotificationsService } from '../notifications/notifications.service';
import type { AppConfig } from '../../config/configuration';

import { UserInvitation, InvitationStatus } from './entities/user-invitation.entity';
import { LicenseAssignment } from './entities/license-assignment.entity';
import { LicenseHistory } from './entities/license-history.entity';

// ─── Hardcoded admin credentials ─────────────────────────────────────────────
const ADMIN_EMAIL = 'Info@aiclex.in';
const ADMIN_PASSWORD = 'Umesh@2003##';
const ADMIN_TOKEN_SECRET = 'zonvo_admin_secret_2024_super_secure';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,

    @InjectRepository(Webinar)
    private readonly webinarRepo: Repository<Webinar>,

    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,

    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,

    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    @InjectRepository(UserInvitation)
    private readonly invitationRepo: Repository<UserInvitation>,

    @InjectRepository(LicenseAssignment)
    private readonly licenseAssignmentRepo: Repository<LicenseAssignment>,

    @InjectRepository(LicenseHistory)
    private readonly licenseHistoryRepo: Repository<LicenseHistory>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly notifService: NotificationsService,
  ) {}

  // ─── Admin Login ─────────────────────────────────────────────────────────

  async adminLogin(email: string, password: string): Promise<string> {
    if (
      email?.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
      password !== ADMIN_PASSWORD
    ) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const token = this.jwtService.sign(
      { role: 'SUPER_ADMIN', email: ADMIN_EMAIL },
      { secret: ADMIN_TOKEN_SECRET, expiresIn: '12h' },
    );

    return token;
  }

  verifyAdminToken(token: string): boolean {
    try {
      const payload = this.jwtService.verify(token, { secret: ADMIN_TOKEN_SECRET });
      return payload?.role === 'SUPER_ADMIN';
    } catch {
      return false;
    }
  }

  // ─── Stats ───────────────────────────────────────────────────────────────

  async getStats() {
    const [
      totalUsers,
      totalWebinars,
      activeWebinars,
      pendingUsers,
      suspendedUsers,
      totalLicenses,
      assignedLicenses,
    ] = await Promise.all([
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.webinarRepo.count(),
      this.webinarRepo.count({ where: { status: 'live' as any } }),
      this.userRepo.count({ where: { status: UserStatus.PENDING } }),
      this.userRepo.count({ where: { status: UserStatus.SUSPENDED } }),
      this.licenseRepo.count({ where: { isActive: true } }),
      this.licenseAssignmentRepo.count({ where: { status: 'active' } }),
    ]);

    // Today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRegistrations = await this.userRepo
      .createQueryBuilder('u')
      .where('u.createdAt >= :today', { today })
      .getCount();

    // Recent 5 users
    const recentUsers = await this.userRepo.find({
      relations: ['profile'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Recent 5 webinars
    const recentWebinars = await this.webinarRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Pending invitations
    const pendingInvitations = await this.invitationRepo.count({
      where: { status: InvitationStatus.PENDING },
    });

    return {
      totalUsers,
      totalWebinars,
      activeWebinars,
      pendingUsers,
      suspendedUsers,
      todayRegistrations,
      totalLicenses,
      assignedLicenses,
      pendingInvitations,
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        name: `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim(),
        createdAt: u.createdAt,
      })),
      recentWebinars: recentWebinars.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        mode: w.mode,
        registeredCount: w.registeredCount ?? 0,
        createdAt: w.createdAt,
      })),
    };
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  async listUsers(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    licenseFilter?: string,
  ) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'p')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(u.email ILIKE :s OR p.firstName ILIKE :s OR p.lastName ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere('u.status = :status', { status });
    }

    if (licenseFilter) {
      // Join license assignments to filter by license slug/id
      const licenseIds = await this.licenseAssignmentRepo
        .createQueryBuilder('la')
        .innerJoin(License, 'l', 'l.id = la.licenseId AND l.slug = :slug', {
          slug: licenseFilter,
        })
        .select('la.userId')
        .getRawMany();
      const uids = licenseIds.map((r: any) => r.la_user_id);
      if (uids.length > 0) {
        qb.andWhere('u.id IN (:...uids)', { uids });
      } else {
        // No users match the license filter
        return { total: 0, page, limit, users: [] };
      }
    }

    const [users, total] = await qb.getManyAndCount();

    // Fetch license assignments for these users
    const userIds = users.map((u) => u.id);
    const assignments =
      userIds.length > 0
        ? await this.licenseAssignmentRepo.find({
            where: { userId: In(userIds), status: 'active' },
          })
        : [];

    const licenseMap = new Map<string, LicenseAssignment>();
    assignments.forEach((a) => licenseMap.set(a.userId, a));

    // Fetch license names
    const licenseIds2 = [...new Set(assignments.map((a) => a.licenseId))];
    const licenses =
      licenseIds2.length > 0
        ? await this.licenseRepo.find({ where: { id: In(licenseIds2) } })
        : [];
    const licenseNameMap = new Map<string, string>();
    licenses.forEach((l) => licenseNameMap.set(l.id, l.name));

    return {
      total,
      page,
      limit,
      users: users.map((u) => {
        const assignment = licenseMap.get(u.id);
        return {
          id: u.id,
          email: u.email,
          status: u.status,
          emailVerified: !!u.emailVerifiedAt,
          name: `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim(),
          phone: u.profile?.phone ?? null,
          timezone: u.profile?.timezone ?? null,
          createdAt: u.createdAt,
          license: assignment
            ? {
                id: assignment.licenseId,
                name: licenseNameMap.get(assignment.licenseId) ?? 'Unknown',
                assignedAt: assignment.assignedAt,
                expiresAt: assignment.expiresAt,
              }
            : null,
        };
      }),
    };
  }

  async getUser(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
      withDeleted: true,
    });

    if (!user) throw new NotFoundException('User not found');

    // Count their webinars
    const webinarCount = await this.webinarRepo.count({ where: { hostUserId: id } });
    const webinars = await this.webinarRepo.find({
      where: { hostUserId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Fetch license
    const assignment = await this.licenseAssignmentRepo.findOne({
      where: { userId: id, status: 'active' },
    });
    let license = null;
    if (assignment) {
      const lic = await this.licenseRepo.findOne({ where: { id: assignment.licenseId } });
      license = lic
        ? {
            id: lic.id,
            name: lic.name,
            slug: lic.slug,
            assignedAt: assignment.assignedAt,
            expiresAt: assignment.expiresAt,
            maxWebinars: lic.maxWebinars,
            maxAttendeesPerWebinar: lic.maxAttendeesPerWebinar,
            features: lic.features,
          }
        : null;
    }

    // Fetch license history
    const licenseHistory = await this.licenseHistoryRepo.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      name: `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim(),
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      phone: user.profile?.phone ?? null,
      timezone: user.profile?.timezone ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      createdAt: user.createdAt,
      webinarCount,
      license,
      licenseHistory,
      webinars: webinars.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        createdAt: w.createdAt,
        registeredCount: w.registeredCount ?? 0,
        attendeeCount: w.attendeeCount ?? 0,
      })),
    };
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    status?: string;
    timezone?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('User with this email already exists');

    const user = this.userRepo.create({
      email: data.email,
      status: (data.status as UserStatus) ?? UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });
    const savedUser = await this.userRepo.save(user);

    const profile = this.profileRepo.create({
      userId: savedUser.id,
      firstName: data.firstName,
      lastName: data.lastName ?? '',
      phone: data.phone ?? null,
      timezone: data.timezone ?? 'UTC',
    });
    await this.profileRepo.save(profile);

    return { id: savedUser.id, email: savedUser.email, status: savedUser.status };
  }

  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      timezone?: string;
      email?: string;
    },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (data.email && data.email !== user.email) {
      const existing = await this.userRepo.findOne({ where: { email: data.email } });
      if (existing) throw new ConflictException('Email already in use');
      await this.userRepo.update({ id }, { email: data.email });
    }

    const profileUpdate: Partial<UserProfile> = {};
    if (data.firstName !== undefined) profileUpdate.firstName = data.firstName;
    if (data.lastName !== undefined) profileUpdate.lastName = data.lastName;
    if (data.phone !== undefined) profileUpdate.phone = data.phone;
    if (data.timezone !== undefined) profileUpdate.timezone = data.timezone;

    if (Object.keys(profileUpdate).length > 0) {
      await this.profileRepo.update({ userId: id }, profileUpdate);
    }

    return { success: true };
  }

  async updateUserStatus(id: string, status: string) {
    await this.userRepo.update({ id }, { status: status as UserStatus });
    return { success: true, status };
  }

  async deleteUser(id: string) {
    const anon = `deleted_${id.replace(/-/g, '').slice(0, 8)}@deleted.zonvo.io`;
    await this.userRepo.update({ id }, {
      email: anon,
      status: UserStatus.DELETED,
    });
    await this.profileRepo.update({ userId: id }, {
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
    });
    await this.userRepo.softDelete({ id });
    return { success: true };
  }

  async bulkUpdateStatus(ids: string[], status: string) {
    if (!ids || ids.length === 0) throw new BadRequestException('No user IDs provided');
    await this.userRepo.update({ id: In(ids) }, { status: status as UserStatus });
    return { success: true, updated: ids.length };
  }

  // ─── Invitations ──────────────────────────────────────────────────────────

  async createInvitation(data: {
    email: string;
    firstName: string;
    lastName?: string;
    roleSlug?: string;
    licenseId?: string;
  }) {
    // Check if email already exists as user
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    // Check for pending invitation
    const pendingInv = await this.invitationRepo.findOne({
      where: { email: data.email, status: InvitationStatus.PENDING },
    });
    if (pendingInv) throw new ConflictException('A pending invitation already exists for this email');

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepo.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      roleSlug: data.roleSlug ?? 'host',
      licenseId: data.licenseId ?? null,
      token,
      status: InvitationStatus.PENDING,
      invitedByEmail: ADMIN_EMAIL,
      expiresAt,
    });

    const saved = await this.invitationRepo.save(invitation);

    const frontendUrl =
      (this.configService as any).get('app.frontendUrl') as string | undefined ??
      'http://localhost:3001';
    const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

    // Send invitation email
    await this.notifService.queue(
      'email',
      data.email,
      'admin.user_invited',
      {
        firstName: data.firstName,
        inviteLink,
        role: data.roleSlug ?? 'host',
        expiresIn: '7 days',
      },
    );

    return {
      id: saved.id,
      email: saved.email,
      status: saved.status,
      expiresAt: saved.expiresAt,
    };
  }

  async listInvitations(page: number, limit: number, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [invitations, total] = await this.invitationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { total, page, limit, invitations };
  }

  async resendInvitation(id: string) {
    const invitation = await this.invitationRepo.findOne({ where: { id } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    // Refresh token and expiry
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.invitationRepo.update({ id }, {
      token,
      expiresAt,
      resendCount: (invitation.resendCount ?? 0) + 1,
      lastResentAt: new Date(),
    });

    const frontendUrl =
      (this.configService as any).get('app.frontendUrl') as string | undefined ??
      'http://localhost:3001';
    const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

    await this.notifService.queue(
      'email',
      invitation.email,
      'admin.user_invited',
      {
        firstName: invitation.firstName,
        inviteLink,
        role: invitation.roleSlug,
        expiresIn: '7 days',
      },
    );

    return { success: true };
  }

  async cancelInvitation(id: string) {
    const invitation = await this.invitationRepo.findOne({ where: { id } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    await this.invitationRepo.update({ id }, { status: InvitationStatus.CANCELLED });
    return { success: true };
  }

  // ─── Licenses ─────────────────────────────────────────────────────────────

  async listLicenses() {
    const licenses = await this.licenseRepo.find({ order: { createdAt: 'DESC' } });

    // Count assignments per license
    const assignmentCounts = await this.licenseAssignmentRepo
      .createQueryBuilder('la')
      .select('la.licenseId', 'licenseId')
      .addSelect('COUNT(la.id)', 'count')
      .where('la.status = :status', { status: 'active' })
      .groupBy('la.licenseId')
      .getRawMany();

    const countMap = new Map<string, number>();
    assignmentCounts.forEach((r: any) =>
      countMap.set(r.licenseId, parseInt(r.count, 10)),
    );

    return licenses.map((l) => ({
      ...l,
      assignedCount: countMap.get(l.id) ?? 0,
    }));
  }

  async listLicenseAssignments(page: number, limit: number, search?: string) {
    const qb = this.licenseAssignmentRepo
      .createQueryBuilder('la')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('la.assignedAt', 'DESC');

    const [assignments, total] = await qb.getManyAndCount();

    // Enrich with user and license data
    const userIds = assignments.map((a) => a.userId);
    const licIds = assignments.map((a) => a.licenseId);

    const [users, licenses] = await Promise.all([
      userIds.length > 0
        ? this.userRepo.find({ where: { id: In(userIds) }, relations: ['profile'] })
        : [],
      licIds.length > 0
        ? this.licenseRepo.find({ where: { id: In(licIds) } })
        : [],
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const licMap = new Map(licenses.map((l) => [l.id, l]));

    let enriched = assignments.map((a) => {
      const u = userMap.get(a.userId);
      const l = licMap.get(a.licenseId);
      return {
        ...a,
        user: u
          ? {
              id: u.id,
              email: u.email,
              name: `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim(),
            }
          : null,
        license: l ? { id: l.id, name: l.name, slug: l.slug } : null,
      };
    });

    if (search) {
      const s = search.toLowerCase();
      enriched = enriched.filter(
        (a) =>
          a.user?.email.toLowerCase().includes(s) ||
          a.user?.name.toLowerCase().includes(s) ||
          a.license?.name.toLowerCase().includes(s),
      );
    }

    return { total, page, limit, assignments: enriched };
  }

  async assignLicense(userId: string, licenseId: string, expiresAt?: Date) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException('User not found');

    const license = await this.licenseRepo.findOne({ where: { id: licenseId } });
    if (!license) throw new NotFoundException('License not found');

    // Remove existing assignment if any
    const existing = await this.licenseAssignmentRepo.findOne({
      where: { userId, status: 'active' },
    });

    if (existing) {
      // Record old assignment removal
      await this.licenseHistoryRepo.save(
        this.licenseHistoryRepo.create({
          userId,
          userEmail: user.email,
          licenseId: existing.licenseId,
          licenseName: 'Previous License',
          action: 'removed_on_reassign',
          actorEmail: ADMIN_EMAIL,
          metadata: {},
        }),
      );
      await this.licenseAssignmentRepo.update({ id: existing.id }, { status: 'revoked' });
    }

    // Create new assignment
    const assignment = this.licenseAssignmentRepo.create({
      userId,
      licenseId,
      assignedByEmail: ADMIN_EMAIL,
      assignedAt: new Date(),
      expiresAt: expiresAt ?? null,
      status: 'active',
    });
    await this.licenseAssignmentRepo.save(assignment);

    // Record history
    await this.licenseHistoryRepo.save(
      this.licenseHistoryRepo.create({
        userId,
        userEmail: user.email,
        licenseId,
        licenseName: license.name,
        action: 'assigned',
        actorEmail: ADMIN_EMAIL,
        metadata: { expiresAt: expiresAt?.toISOString() ?? null },
      }),
    );

    // Send notification email
    await this.notifService.queue(
      'email',
      user.email,
      'admin.license_assigned',
      {
        firstName: user.profile?.firstName ?? 'User',
        licenseName: license.name,
        maxWebinars: String(license.maxWebinars ?? 'Unlimited'),
        maxAttendees: String(license.maxAttendeesPerWebinar ?? 'Unlimited'),
      },
    );

    return { success: true, assignmentId: assignment.id };
  }

  async removeLicense(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const assignment = await this.licenseAssignmentRepo.findOne({
      where: { userId, status: 'active' },
    });
    if (!assignment) throw new NotFoundException('No active license assignment for this user');

    const license = await this.licenseRepo.findOne({ where: { id: assignment.licenseId } });

    await this.licenseAssignmentRepo.update({ id: assignment.id }, { status: 'revoked' });

    // Record history
    await this.licenseHistoryRepo.save(
      this.licenseHistoryRepo.create({
        userId,
        userEmail: user.email,
        licenseId: assignment.licenseId,
        licenseName: license?.name ?? 'Unknown',
        action: 'removed',
        actorEmail: ADMIN_EMAIL,
        metadata: {},
      }),
    );

    // Send notification
    await this.notifService.queue(
      'email',
      user.email,
      'admin.license_removed',
      {
        firstName: user.profile?.firstName ?? 'User',
        licenseName: license?.name ?? 'your license',
      },
    );

    return { success: true };
  }

  async transferLicense(fromUserId: string, toUserId: string) {
    const fromUser = await this.userRepo.findOne({ where: { id: fromUserId }, relations: ['profile'] });
    if (!fromUser) throw new NotFoundException('Source user not found');

    const toUser = await this.userRepo.findOne({ where: { id: toUserId }, relations: ['profile'] });
    if (!toUser) throw new NotFoundException('Target user not found');

    const assignment = await this.licenseAssignmentRepo.findOne({
      where: { userId: fromUserId, status: 'active' },
    });
    if (!assignment) throw new NotFoundException('Source user has no active license');

    const license = await this.licenseRepo.findOne({ where: { id: assignment.licenseId } });

    // Revoke existing toUser license if any
    const toExisting = await this.licenseAssignmentRepo.findOne({
      where: { userId: toUserId, status: 'active' },
    });
    if (toExisting) {
      await this.licenseAssignmentRepo.update({ id: toExisting.id }, { status: 'revoked' });
    }

    // Revoke from source
    await this.licenseAssignmentRepo.update({ id: assignment.id }, { status: 'revoked' });

    // Assign to target
    const newAssignment = this.licenseAssignmentRepo.create({
      userId: toUserId,
      licenseId: assignment.licenseId,
      assignedByEmail: ADMIN_EMAIL,
      assignedAt: new Date(),
      expiresAt: assignment.expiresAt,
      status: 'active',
    });
    await this.licenseAssignmentRepo.save(newAssignment);

    // Record history for both users
    await this.licenseHistoryRepo.save([
      this.licenseHistoryRepo.create({
        userId: fromUserId,
        userEmail: fromUser.email,
        licenseId: assignment.licenseId,
        licenseName: license?.name ?? 'Unknown',
        action: 'transferred_out',
        actorEmail: ADMIN_EMAIL,
        metadata: { toUserId, toEmail: toUser.email },
      }),
      this.licenseHistoryRepo.create({
        userId: toUserId,
        userEmail: toUser.email,
        licenseId: assignment.licenseId,
        licenseName: license?.name ?? 'Unknown',
        action: 'transferred_in',
        actorEmail: ADMIN_EMAIL,
        metadata: { fromUserId, fromEmail: fromUser.email },
      }),
    ]);

    return { success: true };
  }

  async getLicenseHistory(page: number, limit: number) {
    const [history, total] = await this.licenseHistoryRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { total, page, limit, history };
  }

  // ─── Roles & Permissions ──────────────────────────────────────────────────

  async listRoles() {
    return this.roleRepo.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { displayOrder: 'ASC' },
    });
  }

  async listPermissions() {
    return this.permissionRepo.find({ order: { module: 'ASC', name: 'ASC' } });
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Delete existing permissions for this role
    await this.rolePermissionRepo.delete({ roleId });

    // Insert new ones
    if (permissionIds.length > 0) {
      const newPerms = permissionIds.map((permissionId) =>
        this.rolePermissionRepo.create({ roleId, permissionId }),
      );
      await this.rolePermissionRepo.save(newPerms);
    }

    return { success: true, roleId, permissionsCount: permissionIds.length };
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────

  async getActivityLogs(
    page: number,
    limit: number,
    action?: string,
    actorId?: string,
  ) {
    const qb = this.auditRepo
      .createQueryBuilder('al')
      .orderBy('al.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (action) {
      qb.andWhere('al.action ILIKE :action', { action: `%${action}%` });
    }
    if (actorId) {
      qb.andWhere('al.actorId = :actorId', { actorId });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { total, page, limit, logs };
  }

  // ─── Email Logs ───────────────────────────────────────────────────────────

  async getEmailLogs(
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ) {
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where("n.type = 'email'")
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(n.toAddress ILIKE :s OR n.templateKey ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (status) {
      qb.andWhere('n.status = :status', { status });
    }

    const [logs, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      logs: logs.map((n) => ({
        id: n.id,
        to: n.toAddress,
        templateKey: n.templateKey,
        status: n.status,
        attempts: n.attempts,
        sentAt: n.sentAt,
        errorMessage: n.errorMessage,
        createdAt: n.createdAt,
      })),
    };
  }

  // ─── Webinars ─────────────────────────────────────────────────────────────

  async listWebinars(page: number, limit: number, search?: string, status?: string) {
    const qb = this.webinarRepo
      .createQueryBuilder('w')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('w.createdAt', 'DESC');

    if (search) {
      qb.andWhere('w.title ILIKE :s', { s: `%${search}%` });
    }

    if (status) {
      qb.andWhere('w.status = :status', { status });
    }

    const [webinars, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      webinars: webinars.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        mode: w.mode,
        scheduledAt: w.scheduledAt,
        hostUserId: w.hostUserId,
        registeredCount: w.registeredCount ?? 0,
        attendeeCount: w.attendeeCount ?? 0,
        joinCode: w.joinCode,
        createdAt: w.createdAt,
      })),
    };
  }

  async getWebinar(id: string) {
    const w = await this.webinarRepo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Webinar not found');

    const host = await this.userRepo.findOne({
      where: { id: w.hostUserId },
      relations: ['profile'],
    });

    const registrants = (w.settings?.registrants as any[]) ?? [];
    const attendees = (w.settings?.attendees as any[]) ?? [];

    return {
      id: w.id,
      title: w.title,
      description: w.description,
      status: w.status,
      mode: w.mode,
      scheduledAt: w.scheduledAt,
      durationMinutes: w.durationMinutes,
      joinCode: w.joinCode,
      registeredCount: w.registeredCount ?? registrants.length,
      attendeeCount: w.attendeeCount ?? attendees.length,
      createdAt: w.createdAt,
      host: host
        ? {
            id: host.id,
            email: host.email,
            name: `${host.profile?.firstName ?? ''} ${host.profile?.lastName ?? ''}`.trim(),
          }
        : null,
      registrants,
      attendees,
    };
  }

  async deleteWebinar(id: string) {
    await this.webinarRepo.delete({ id });
    return { success: true };
  }

  // ─── Recent Activity ──────────────────────────────────────────────────────

  async getRecentActivity() {
    const [recentUsers, recentWebinars, recentInvitations] = await Promise.all([
      this.userRepo.find({
        relations: ['profile'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.webinarRepo.find({
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.invitationRepo.find({
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        name: `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim(),
        createdAt: u.createdAt,
      })),
      recentWebinars: recentWebinars.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        mode: w.mode,
        registeredCount: w.registeredCount ?? 0,
        createdAt: w.createdAt,
      })),
      recentInvitations: recentInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    };
  }
}
