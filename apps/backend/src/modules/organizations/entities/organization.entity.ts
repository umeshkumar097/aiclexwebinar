import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { License } from '../../licenses/entities/license.entity';
import { OrganizationBranding } from './organization-branding.entity';
import { OrganizationMember } from './organization-member.entity';

export enum OrgStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

@Entity('organizations')
@Index(['slug'], { unique: true })
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  slug!: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'logo_storage_key', type: 'varchar', length: 500, nullable: true })
  logoStorageKey!: string | null;

  @Column({ name: 'license_id', type: 'uuid', nullable: false })
  licenseId!: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: false })
  ownerId!: string;

  @Column({ type: 'enum', enum: OrgStatus, default: OrgStatus.ACTIVE })
  status!: OrgStatus;

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, unknown>;

  @ManyToOne(() => License, { eager: false })
  @JoinColumn({ name: 'license_id' })
  license!: License;

  @OneToMany(() => OrganizationMember, (m) => m.organization, { eager: false })
  members!: OrganizationMember[];

  @ManyToOne(() => OrganizationBranding, { eager: false })
  branding!: OrganizationBranding | null;
}
