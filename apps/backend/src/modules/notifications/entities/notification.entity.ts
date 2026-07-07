import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export enum NotificationType { EMAIL = 'email', WHATSAPP = 'whatsapp', IN_APP = 'in_app', PUSH = 'push' }
export enum NotificationStatus { PENDING = 'pending', QUEUED = 'queued', SENT = 'sent', FAILED = 'failed', READ = 'read' }

@Entity('notifications')
@Index(['userId'])
@Index(['orgId'])
@Index(['status'])
export class Notification extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;
  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId!: string | null;
  @Column({ name: 'to_address', type: 'varchar', length: 255, nullable: true })
  toAddress!: string | null;
  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;
  @Column({ name: 'template_key', type: 'varchar', length: 100 })
  templateKey!: string;
  @Column({ type: 'jsonb', default: {} })
  variables!: Record<string, string>;
  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status!: NotificationStatus;
  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId!: string | null;
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;
  @Column({ name: 'attempts', type: 'integer', default: 0 })
  attempts!: number;
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;
}
