import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { DeviceSession } from './device-session.entity';
import { GdprErasureJob } from './gdpr-erasure-job.entity';
import { UserConsent } from './user-consent.entity';
import { UserCredential } from './user-credential.entity';
import { UserProfile } from './user-profile.entity';

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('users')
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email!: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
    nullable: false,
  })
  status!: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  profile!: UserProfile;

  @OneToOne(() => UserCredential, (credential) => credential.user, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  credential!: UserCredential;

  @OneToMany(() => DeviceSession, (session) => session.user, {
    eager: false,
  })
  deviceSessions!: DeviceSession[];

  @OneToMany(() => UserConsent, (consent) => consent.user, {
    eager: false,
  })
  consents!: UserConsent[];

  @OneToMany(() => GdprErasureJob, (job) => job.user, {
    eager: false,
  })
  erasureJobs!: GdprErasureJob[];
}
