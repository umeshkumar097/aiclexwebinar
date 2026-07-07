import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserStatus } from '../auth/entities/user.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,

    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Get Own Profile ─────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Update Own Profile ───────────────────────────────────────────────────────

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    Object.assign(profile, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.locale !== undefined && { locale: dto.locale }),
    });

    return this.profileRepository.save(profile);
  }

  // ─── Upload Avatar ────────────────────────────────────────────────────────────

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<{ avatarUrl: string }> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are allowed');
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be under 5MB');
    }

    const ext = originalName.split('.').pop() ?? 'jpg';
    const key = `avatars/${userId}/avatar.${ext}`;

    await this.storageService.upload('ASSETS', buffer, {
      contentType: mimeType,
      metadata: { userId },
      key,
    });

    const avatarUrl = await this.storageService.getSignedUrl('ASSETS', key, 86400);

    return { avatarUrl };
  }

  // ─── Admin: List Users ────────────────────────────────────────────────────────

  async listUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ users: User[]; total: number }> {
    const qb = this.userRepository.createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'p')
      .where('u.deletedAt IS NULL')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('u.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(u.email ILIKE :search OR p.firstName ILIKE :search OR p.lastName ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await qb.getManyAndCount();
    return { users, total };
  }

  // ─── Admin: Get User ─────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
      withDeleted: true,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Admin: Update Status ─────────────────────────────────────────────────────

  async updateStatus(
    targetUserId: string,
    status: UserStatus,
    actorId: string,
  ): Promise<void> {
    const user = await this.getUserById(targetUserId);
    const prevStatus = user.status;

    await this.userRepository.update({ id: targetUserId }, { status });

    await this.auditService.log({
      action: 'user.status_changed',
      resourceType: 'user',
      resourceId: targetUserId,
      actorId,
      beforeState: { status: prevStatus },
      afterState: { status },
    });
  }

  // ─── Admin: Soft Delete ───────────────────────────────────────────────────────

  async deleteUser(targetUserId: string, actorId: string): Promise<void> {
    const user = await this.getUserById(targetUserId);

    // Anonymize PII before soft-delete
    const anon = `deleted_${targetUserId.replace(/-/g, '').slice(0, 8)}@deleted.zonvo.io`;
    await this.userRepository.update({ id: targetUserId }, {
      email: anon,
      status: UserStatus.DELETED,
    });

    await this.profileRepository.update({ userId: targetUserId }, {
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
    });

    await this.userRepository.softDelete({ id: targetUserId });

    await this.auditService.log({
      action: 'user.deleted',
      resourceType: 'user',
      resourceId: targetUserId,
      actorId,
      metadata: { originalEmail: user.email },
    });
  }
}
