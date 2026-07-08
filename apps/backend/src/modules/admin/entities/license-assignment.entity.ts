import { Column, Entity, Index, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('license_assignments')
@Index(['userId'], { unique: true })
@Index(['licenseId'])
@Index(['status'])
export class LicenseAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'license_id', type: 'uuid' })
  licenseId!: string;

  @Column({ name: 'assigned_by_email', type: 'varchar', length: 255 })
  assignedByEmail!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
