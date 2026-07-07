import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Organization } from './organization.entity';

@Entity('host_onboarding_progress')
export class HostOnboardingProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid', unique: true, nullable: false })
  @Index()
  orgId!: string;

  @Column({ name: 'profile_completed', type: 'boolean', default: false })
  profileCompleted!: boolean;

  @Column({ name: 'first_webinar_created', type: 'boolean', default: false })
  firstWebinarCreated!: boolean;

  @Column({ name: 'first_recording_uploaded', type: 'boolean', default: false })
  firstRecordingUploaded!: boolean;

  @Column({ name: 'branding_configured', type: 'boolean', default: false })
  brandingConfigured!: boolean;

  @Column({ name: 'email_configured', type: 'boolean', default: false })
  emailConfigured!: boolean;

  @Column({ name: 'first_webinar_live', type: 'boolean', default: false })
  firstWebinarLive!: boolean;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt!: Date | null;

  @OneToOne(() => Organization)
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;
}
