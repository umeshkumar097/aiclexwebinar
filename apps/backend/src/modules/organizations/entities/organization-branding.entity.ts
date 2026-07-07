import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { Organization } from './organization.entity';

@Entity('organization_branding')
export class OrganizationBranding extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', unique: true, nullable: false })
  orgId!: string;

  @Column({ name: 'primary_color', type: 'varchar', length: 7, nullable: true })
  primaryColor!: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'favicon_url', type: 'varchar', length: 500, nullable: true })
  faviconUrl!: string | null;

  @Column({ name: 'custom_domain', type: 'varchar', length: 255, nullable: true })
  customDomain!: string | null;

  @Column({ name: 'email_sender_name', type: 'varchar', length: 100, nullable: true })
  emailSenderName!: string | null;

  @Column({ name: 'email_sender_address', type: 'varchar', length: 255, nullable: true })
  emailSenderAddress!: string | null;

  @OneToOne(() => Organization)
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;
}
