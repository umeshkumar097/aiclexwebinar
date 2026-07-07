import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum SubscriptionStatus {
  TRIALING   = 'trialing',
  ACTIVE     = 'active',
  PAST_DUE   = 'past_due',
  CANCELLED  = 'cancelled',
  UNPAID     = 'unpaid',
  INCOMPLETE = 'incomplete',
}

export enum PlanType {
  FREE     = 'free',
  PRO      = 'pro',
  BUSINESS = 'business',
}

@Entity('subscriptions')
@Index(['orgId'])
@Index(['stripeSubscriptionId'], { unique: true, where: '"stripe_subscription_id" IS NOT NULL' })
@Index(['stripeCustomerId'])
export class Subscription extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', nullable: false })
  orgId!: string;

  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 255, nullable: true })
  stripeCustomerId!: string | null;

  @Column({ name: 'stripe_subscription_id', type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId!: string | null;

  @Column({ name: 'stripe_price_id', type: 'varchar', length: 255, nullable: true })
  stripePriceId!: string | null;

  @Column({ name: 'plan_type', type: 'enum', enum: PlanType, default: PlanType.FREE })
  planType!: PlanType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'trial_end', type: 'timestamptz', nullable: true })
  trialEnd!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;
}
