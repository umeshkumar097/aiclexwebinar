import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export enum ExportStatus { PENDING = 'pending', PROCESSING = 'processing', READY = 'ready', FAILED = 'failed', EXPIRED = 'expired' }
export enum ExportType { REGISTRATIONS = 'registrations', ATTENDEES = 'attendees', ANALYTICS = 'analytics', AUDIT_LOG = 'audit_log' }

@Entity('exports')
@Index(['orgId'])
@Index(['requestedBy'])
export class Export extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', nullable: false }) orgId!: string;
  @Column({ name: 'requested_by', type: 'uuid', nullable: false }) requestedBy!: string;
  @Column({ type: 'enum', enum: ExportType }) type!: ExportType;
  @Column({ type: 'enum', enum: ExportStatus, default: ExportStatus.PENDING }) status!: ExportStatus;
  @Column({ type: 'jsonb', default: {} }) filters!: Record<string, unknown>;
  @Column({ name: 'storage_key', type: 'varchar', length: 500, nullable: true }) storageKey!: string | null;
  @Column({ name: 'row_count', type: 'integer', nullable: true }) rowCount!: number | null;
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true }) expiresAt!: Date | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
}
