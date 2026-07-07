import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity('licenses')
@Index(['slug'], { unique: true })
export class License extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  slug!: string;

  @Column({ name: 'max_webinars', type: 'integer', nullable: true })
  maxWebinars!: number | null;

  @Column({ name: 'max_attendees_per_webinar', type: 'integer', nullable: true })
  maxAttendeesPerWebinar!: number | null;

  @Column({ name: 'max_hosts', type: 'integer', nullable: true })
  maxHosts!: number | null;

  @Column({ name: 'max_storage_gb', type: 'integer', nullable: true })
  maxStorageGb!: number | null;

  @Column({ type: 'jsonb', default: [] })
  features!: string[];

  @Column({ name: 'price_monthly_cents', type: 'integer', nullable: true })
  priceMonthCents!: number | null;

  @Column({ name: 'price_annual_cents', type: 'integer', nullable: true })
  priceAnnualCents!: number | null;

  @Column({ type: 'varchar', length: 3, default: 'USD', nullable: false })
  currency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
