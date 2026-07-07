import { Column, Entity, Index } from 'typeorm';
import { PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * Audit logs table — intentionally no FK constraints for performance.
 * Actor info is denormalized at write time.
 * Table is range-partitioned by created_at in production (monthly partitions).
 */
@Entity('audit_logs')
@Index(['actorId'])
@Index(['orgId'])
@Index(['action'])
@Index(['resourceType', 'resourceId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail!: string | null;

  @Column({ name: 'actor_ip', type: 'varchar', length: 45, nullable: true })
  actorIp!: string | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: false })
  action!: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 50, nullable: false })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState!: unknown;

  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState!: unknown;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
