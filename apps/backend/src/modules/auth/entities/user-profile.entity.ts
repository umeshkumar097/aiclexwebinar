import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
} from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: false })
  @Index()
  userId!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: false })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: false })
  lastName!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'avatar_storage_key', type: 'varchar', length: 500, nullable: true })
  avatarStorageKey!: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'timezone', type: 'varchar', length: 60, default: 'UTC', nullable: false })
  timezone!: string;

  @Column({ name: 'locale', type: 'varchar', length: 10, default: 'en', nullable: false })
  locale!: string;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // ─── Computed ──────────────────────────────────────────────────────────────

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
