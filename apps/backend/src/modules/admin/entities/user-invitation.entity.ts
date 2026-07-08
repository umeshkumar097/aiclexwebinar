import { Column, Entity, Index, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

@Entity('user_invitations')
@Index(['email'])
@Index(['token'], { unique: true })
@Index(['status'])
export class UserInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName!: string | null;

  @Column({ name: 'role_slug', type: 'varchar', length: 100, default: 'host' })
  roleSlug!: string;

  @Column({ name: 'license_id', type: 'uuid', nullable: true })
  licenseId!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status!: InvitationStatus;

  @Column({ name: 'invited_by_email', type: 'varchar', length: 255 })
  invitedByEmail!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'resend_count', type: 'int', default: 0 })
  resendCount!: number;

  @Column({ name: 'last_resent_at', type: 'timestamptz', nullable: true })
  lastResentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
