import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { forwardRef, Inject } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { UserInvitation, InvitationStatus } from '../admin/entities/user-invitation.entity';
import { LicenseAssignment } from '../admin/entities/license-assignment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { AUDIT_ACTIONS, BCRYPT_ROUNDS, NOTIFICATION_TEMPLATES, REDIS_KEYS } from '@zonvo/constants';

import type { AppConfig } from '../../config/configuration';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { Role } from '../rbac/entities/role.entity';
import { CacheService } from '../../redis/cache.service';
import { DeviceSession, DeviceType } from './entities/device-session.entity';
import { UserConsent } from './entities/user-consent.entity';
import { UserCredential } from './entities/user-credential.entity';
import { User, UserStatus } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DeviceInfo {
  deviceName?: string | null;
  deviceType?: DeviceType;
  browser?: string | null;
  os?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserProfile)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly profileRepository: Repository<UserProfile>,

    @InjectRepository(UserCredential)
    private readonly credentialRepository: Repository<UserCredential>,

    @InjectRepository(DeviceSession)
    private readonly sessionRepository: Repository<DeviceSession>,

    @InjectRepository(UserConsent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly consentRepository: Repository<UserConsent>,

    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,

    @InjectRepository(UserInvitation)
    private readonly invitationRepository: Repository<UserInvitation>,

    @InjectRepository(LicenseAssignment)
    private readonly licenseAssignmentRepository: Repository<LicenseAssignment>,

    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,

    @InjectRepository(Role)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly permissionRepository: Repository<Permission>,

    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ userId: string; email: string; message: string }> {
    // Check duplicate email
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: false,
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user + profile + credential + consent in a single transaction
    const user = await this.dataSource.transaction(async (manager) => {
      const newUser = manager.create(User, {
        email: dto.email,
        status: UserStatus.PENDING,
      });
      const savedUser = (await manager.save(User, newUser)) as User;

      await manager.save(UserProfile, {
        userId: savedUser.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        timezone: dto.timezone ?? 'UTC',
        locale: 'en',
      });

      await manager.save(UserCredential, {
        userId: savedUser.id,
        passwordHash,
      });

      await manager.save(UserConsent, {
        userId: savedUser.id,
        consentType: 'terms_of_service',
        version: '1.0',
        granted: true,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });

      return savedUser;
    }) as User;

    // Queue verification email
    await this.sendVerificationEmail(user.id, user.email, dto.firstName);

    // Audit log
    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user.id,
      actorId: user.id,
      actorEmail: user.email,
      actorIp: ipAddress,
      metadata: { timezone: dto.timezone },
    });

    return {
      userId: user.id,
      email: user.email,
      message: 'Account created. Please verify your email.',
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    deviceInfo: DeviceInfo,
  ): Promise<TokenPair & { user: { id: string; email: string; firstName: string; lastName: string; status: string } }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['profile', 'credential'],
    });

    // Always hash check to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingattemptprotection123456789';
    const passwordHash = user?.credential?.passwordHash ?? dummyHash;
    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !isPasswordValid) {
      await this.auditService.log({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        resourceType: 'user',
        actorEmail: dto.email,
        actorIp: deviceInfo.ipAddress ?? undefined,
        metadata: { reason: 'invalid_credentials' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      await this.sendVerificationEmail(user.id, user.email, user.profile?.firstName ?? 'User');
      throw new ForbiddenException('Please verify your email address to log in. A new verification link has been sent.');
    }


    // Load user roles and permissions
    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id);

    // Generate token pair
    const tokens = await this.generateTokenPair(user.id, user.email, null, roles, permissions, deviceInfo);

    // Audit log
    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_LOGIN,
      resourceType: 'user',
      resourceId: user.id,
      actorId: user.id,
      actorEmail: user.email,
      actorIp: deviceInfo.ipAddress ?? undefined,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName ?? '',
        lastName: user.profile?.lastName ?? '',
        status: user.status,
      },
    };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string, deviceInfo: DeviceInfo): Promise<TokenPair> {
    // Find all sessions to check for token reuse
    const sessions = await this.sessionRepository.find({
      where: { revokedAt: undefined as never },
    });

    let matchedSession: DeviceSession | null = null;

    for (const session of sessions) {
      if (session.revokedAt !== null) continue;
      const matches = await bcrypt.compare(rawRefreshToken, session.refreshTokenHash);
      if (matches) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      // Token not found at all — could be reuse of already-revoked token
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Load user
    const user = await this.userRepository.findOne({
      where: { id: matchedSession.userId },
      relations: ['profile'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Session invalid');
    }

    // Revoke old session
    matchedSession.revokedAt = new Date();
    await this.sessionRepository.save(matchedSession);

    // Get updated roles/permissions
    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id);

    // Issue new token pair
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      null,
      roles,
      permissions,
      deviceInfo,
    );

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_LOGIN,
      resourceType: 'device_session',
      resourceId: matchedSession.id,
      actorId: user.id,
      actorEmail: user.email,
      actorIp: deviceInfo.ipAddress ?? undefined,
      metadata: { action: 'token_refresh' },
    });

    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return; // Idempotent — already revoked
    }

    session.revokedAt = new Date();
    await this.sessionRepository.save(session);

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_LOGOUT,
      resourceType: 'device_session',
      resourceId: sessionId,
      actorId: userId,
    });
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string): Promise<void> {
    // Find user — always return success to prevent email enumeration
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['profile'],
    });

    if (!user || user.status === UserStatus.DELETED) {
      // Deliberate no-op to prevent enumeration
      return;
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const redisKey = REDIS_KEYS.PASSWORD_RESET_TOKEN(token);

    // Store hashed token in Redis (1 hour expiry)
    await this.cacheService.set(redisKey, user.id, 3600);

    // Queue email
    const frontendUrl = this.configService.get('app.frontendUrl', { infer: true });
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.notificationsService.queue(
      'email',
      user.email,
      NOTIFICATION_TEMPLATES.RESET_PASSWORD,
      {
        firstName: user.profile?.firstName ?? 'User',
        resetLink,
        expiryHours: '1',
      },
    );

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
      resourceType: 'user',
      resourceId: user.id,
      actorEmail: dto.email,
      actorIp: ipAddress,
      metadata: { initiated: true },
    });
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const redisKey = REDIS_KEYS.PASSWORD_RESET_TOKEN(dto.token);
    const userId = await this.cacheService.get<string>(redisKey);

    if (!userId) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const credential = await this.credentialRepository.findOne({ where: { userId } });
    if (!credential) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    credential.passwordHash = passwordHash;
    await this.credentialRepository.save(credential);

    // Delete token from Redis
    await this.cacheService.del(redisKey);

    // Revoke all device sessions for security
    await this.sessionRepository
      .createQueryBuilder()
      .update(DeviceSession)
      .set({ revokedAt: new Date() })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_PASSWORD_CHANGED,
      resourceType: 'user',
      resourceId: userId,
      metadata: { via: 'reset_token' },
    });
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    const redisKey = REDIS_KEYS.EMAIL_VERIFY_TOKEN(token);
    const userId = await this.cacheService.get<string>(redisKey);

    if (!userId) {
      throw new BadRequestException('Verification token is invalid or has expired');
    }

    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['profile'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerifiedAt) {
      // Already verified — idempotent
      await this.cacheService.del(redisKey);
      return;
    }

    user.emailVerifiedAt = new Date();
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);
    await this.cacheService.del(redisKey);

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_EMAIL_VERIFIED,
      resourceType: 'user',
      resourceId: user.id,
      actorId: user.id,
    });

    // Send welcome "account activated" email
    const frontendUrl = this.configService.get('app.frontendUrl', { infer: true });
    await this.notificationsService.queue(
      'email',
      user.email,
      'auth.account_activated',
      {
        firstName: user.profile?.firstName ?? 'there',
        dashboardLink: `${frontendUrl}/dashboard`,
      },
    );
  }

  // ─── Change Password ─────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentSessionId: string,
  ): Promise<void> {
    const credential = await this.credentialRepository.findOne({ where: { userId } });
    if (!credential) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, credential.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    credential.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.credentialRepository.save(credential);

    // Revoke all OTHER sessions (not current)
    await this.sessionRepository
      .createQueryBuilder()
      .update(DeviceSession)
      .set({ revokedAt: new Date() })
      .where('userId = :userId AND id != :currentSessionId AND revokedAt IS NULL', {
        userId,
        currentSessionId,
      })
      .execute();

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_PASSWORD_CHANGED,
      resourceType: 'user',
      resourceId: userId,
      actorId: userId,
      metadata: { via: 'user_change', otherSessionsRevoked: true },
    });
  }

  // ─── Get Device Sessions ─────────────────────────────────────────────────────

  async getDeviceSessions(userId: string, currentSessionId: string): Promise<DeviceSession[]> {
    const sessions = await this.sessionRepository.find({
      where: { userId, revokedAt: undefined as never },
      order: { lastActiveAt: 'DESC' },
    });

    return sessions
      .filter((s) => s.revokedAt === null)
      .map((s) => ({ ...s, isCurrent: s.id === currentSessionId })) as unknown as DeviceSession[];
  }

  // ─── Revoke Device Session ────────────────────────────────────────────────────

  async revokeDeviceSession(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.revokedAt !== null) {
      return; // Already revoked — idempotent
    }

    session.revokedAt = new Date();
    await this.sessionRepository.save(session);

    await this.auditService.log({
      action: AUDIT_ACTIONS.USER_DEVICE_REVOKED,
      resourceType: 'device_session',
      resourceId: sessionId,
      actorId: userId,
    });
  }

  // ─── Resend Verification ──────────────────────────────────────────────────────

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });

    if (!user || user.emailVerifiedAt) {
      return; // Prevent enumeration
    }

    await this.sendVerificationEmail(user.id, user.email, user.profile?.firstName ?? 'User');
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  async generateTokenPair(
    userId: string,
    email: string,
    orgId: string | null,
    roles: string[],
    permissions: string[],
    deviceInfo: DeviceInfo,
  ): Promise<TokenPair> {
    const sessionId = uuidv4();
    const accessExpiry = this.configService.get('jwt.accessExpiry', { infer: true });
    const refreshExpiryDays = this.configService.get('jwt.refreshExpiryDays', { infer: true });
    const privateKey = this.configService.get('jwt.privateKey', { infer: true });

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      orgId,
      roles,
      permissions,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: accessExpiry,
    });

    // Generate opaque refresh token + hash it for storage
    const rawRefreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.sessionRepository.save({
      id: sessionId,
      userId,
      refreshTokenHash,
      deviceName: deviceInfo.deviceName?.substring(0, 250) ?? null,
      deviceType: deviceInfo.deviceType ?? DeviceType.UNKNOWN,
      browser: deviceInfo.browser?.substring(0, 490) ?? null,
      os: deviceInfo.os?.substring(0, 490) ?? null,
      ipAddress: deviceInfo.ipAddress ?? null,
      lastActiveAt: new Date(),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: accessExpiry,
    };
  }

  async getUserRolesAndPermissions(
    userId: string,
    orgId?: string,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    // Get org-specific membership role
    const memberQuery = this.memberRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rp')
      .leftJoinAndSelect('rp.permission', 'permission')
      .where('m.userId = :userId', { userId });

    if (orgId) {
      memberQuery.andWhere('m.orgId = :orgId', { orgId });
    }

    const memberships = await memberQuery.getMany();

    const roles = new Set<string>();
    const permissions = new Set<string>();

    for (const membership of memberships) {
      if (membership.role) {
        roles.add(membership.role.slug);
        for (const rp of membership.role.rolePermissions ?? []) {
          if (rp.permission) {
            permissions.add(rp.permission.slug);
          }
        }
      }
    }

    return {
      roles: Array.from(roles),
      permissions: Array.from(permissions),
    };
  }

  private async sendVerificationEmail(
    userId: string,
    email: string,
    firstName: string,
  ): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const redisKey = REDIS_KEYS.EMAIL_VERIFY_TOKEN(token);

    await this.cacheService.set(redisKey, userId, 86400); // 24 hours

    const frontendUrl = this.configService.get('app.frontendUrl', { infer: true });
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

    await this.notificationsService.queue(
      'email',
      email,
      NOTIFICATION_TEMPLATES.VERIFY_EMAIL,
      { firstName, verifyLink },
    );
  }

  // ─── Invitations ─────────────────────────────────────────────────────────────

  async getInvitationInfo(token: string) {
    const invitation = await this.invitationRepository.findOne({ where: { token } });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found, expired, or already accepted');
    }

    const user = await this.userRepository.findOne({ where: { email: invitation.email } });
    return {
      email: invitation.email,
      firstName: invitation.firstName,
      invitedByEmail: invitation.invitedByEmail,
      userExists: !!user,
    };
  }

  async acceptInvite(token: string, password?: string) {
    const invitation = await this.invitationRepository.findOne({ where: { token } });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found, expired, or already accepted');
    }

    let user = await this.userRepository.findOne({ where: { email: invitation.email } });
    
    // Create user if not exists
    if (!user) {
      if (!password) throw new BadRequestException('Password is required for new users');
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const newUser = queryRunner.manager.create(User, {
          email: invitation.email,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        });
        user = await queryRunner.manager.save(User, newUser);

        await queryRunner.manager.save(UserProfile, {
          userId: user.id,
          firstName: invitation.firstName,
          lastName: invitation.lastName || '',
          timezone: 'UTC',
          locale: 'en',
        });

        const passwordHash = await bcrypt.hash(password, 12);
        await queryRunner.manager.save(UserCredential, {
          userId: user.id,
          passwordHash,
        });

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    // Assign license
    if (invitation.licenseId) {
      await this.adminService.assignLicense(user.id, invitation.licenseId);
    }

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    // Generate tokens for auto-login
    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id);
    return this.generateTokenPair(user.id, user.email, null, roles, permissions, {});
  }


  async getManagedBy(userId: string): Promise<string | null> {
    const assignment = await this.licenseAssignmentRepository.findOne({
      where: { userId, status: 'active' },
    });
    // If assigned by the system or self, we might not show it as managed by
    if (assignment && assignment.assignedByEmail && assignment.assignedByEmail !== 'system') {
      return assignment.assignedByEmail;
    }
    return null;
  }

}
