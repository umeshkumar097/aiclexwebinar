import { Column, Entity, Index, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('license_history')
@Index(['userId'])
@Index(['licenseId'])
export class LicenseHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'user_email', type: 'varchar', length: 255 })
  userEmail!: string;

  @Column({ name: 'license_id', type: 'uuid' })
  licenseId!: string;

  @Column({ name: 'license_name', type: 'varchar', length: 100 })
  licenseName!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ name: 'actor_email', type: 'varchar', length: 255 })
  actorEmail!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
