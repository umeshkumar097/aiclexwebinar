import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from './user.entity';

@Entity('user_consents')
@Index(['userId', 'consentType'])
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'consent_type', type: 'varchar', length: 50, nullable: false })
  consentType!: string;

  @Column({ name: 'version', type: 'varchar', length: 20, nullable: false })
  version!: string;

  @Column({ name: 'granted', type: 'boolean', nullable: false })
  granted!: boolean;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamptz' })
  grantedAt!: Date;

  @ManyToOne(() => User, (user) => user.consents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
