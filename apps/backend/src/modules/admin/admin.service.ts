import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { User, UserStatus } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Webinar } from '../webinars/entities/webinar.entity';
import type { AppConfig } from '../../config/configuration';

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

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
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
    const [totalUsers, totalWebinars, activeWebinars, pendingUsers] = await Promise.all([
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.webinarRepo.count(),
      this.webinarRepo.count({ where: { status: 'live' as any } }),
      this.userRepo.count({ where: { status: UserStatus.PENDING } }),
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

    return {
      totalUsers,
      totalWebinars,
      activeWebinars,
      pendingUsers,
      todayRegistrations,
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

  async listUsers(page: number, limit: number, search?: string, status?: string) {
    const qb = this.userRepo.createQueryBuilder('u')
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

    const [users, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        emailVerified: !!u.emailVerifiedAt,
        name: `${u.profile?.firstName ?? ''} ${u.profile?.lastName ?? ''}`.trim(),
        phone: u.profile?.phone ?? null,
        createdAt: u.createdAt,
      })),
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

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      name: `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim(),
      phone: user.profile?.phone ?? null,
      timezone: user.profile?.timezone ?? null,
      createdAt: user.createdAt,
      webinarCount,
      webinars: webinars.map((w) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        createdAt: w.createdAt,
        registeredCount: w.registeredCount ?? 0,
      })),
    };
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

  // ─── Webinars ─────────────────────────────────────────────────────────────

  async listWebinars(page: number, limit: number, search?: string, status?: string) {
    const qb = this.webinarRepo.createQueryBuilder('w')
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

    // Get host info
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
      host: host ? {
        id: host.id,
        email: host.email,
        name: `${host.profile?.firstName ?? ''} ${host.profile?.lastName ?? ''}`.trim(),
      } : null,
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
    const [recentUsers, recentWebinars] = await Promise.all([
      this.userRepo.find({
        relations: ['profile'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.webinarRepo.find({
        order: { createdAt: 'DESC' },
        take: 10,
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
    };
  }
}
