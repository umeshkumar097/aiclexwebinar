import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../auth/entities/user.entity';

export enum WebinarStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum WebinarMode {
  SEMI_LIVE = 'semi_live',
  FULLY_LIVE = 'fully_live',
}

@Entity('webinars')
@Index(['organizationId'])
@Index(['hostUserId'])
@Index(['status'])
@Index(['joinCode'], { unique: true })
export class Webinar {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ name: 'host_user_id', type: 'uuid', nullable: false })
  hostUserId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // 8-character alphanumeric join code (e.g. "ABC12345")
  @Column({ name: 'join_code', type: 'varchar', length: 10, unique: true, nullable: true })
  joinCode!: string | null;

  // Optional password to protect the webinar
  @Column({ name: 'password', type: 'varchar', length: 100, nullable: true })
  password!: string | null;

  @Column({ name: 'status', type: 'enum', enum: WebinarStatus, default: WebinarStatus.DRAFT })
  status!: WebinarStatus;

  @Column({ name: 'mode', type: 'enum', enum: WebinarMode, default: WebinarMode.SEMI_LIVE })
  mode!: WebinarMode;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'duration_minutes', type: 'int', default: 60 })
  durationMinutes!: number;

  @Column({ name: 'max_attendees', type: 'int', default: 100 })
  maxAttendees!: number;

  @Column({ name: 'registered_count', type: 'int', default: 0 })
  registeredCount!: number;

  @Column({ name: 'attendee_count', type: 'int', default: 0 })
  attendeeCount!: number;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'replay_url', type: 'text', nullable: true })
  replayUrl!: string | null;

  @Column({ name: 'settings', type: 'jsonb', default: {} })
  settings!: Record<string, unknown>;

  // LiveKit room name (auto-generated on go-live)
  @Column({ name: 'livekit_room', type: 'varchar', length: 255, nullable: true })
  livekitRoom!: string | null;

  // Semi-Live: pre-recorded video URL (MP4 / YouTube embed)
  @Column({ name: 'video_url', type: 'text', nullable: true })
  videoUrl!: string | null;

  // Semi-Live: timed events [{timeSeconds, type, data}]
  @Column({ name: 'timed_events', type: 'jsonb', default: [] })
  timedEvents!: Array<{ timeSeconds: number; type: string; data: Record<string, unknown> }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  host!: User;
}
