import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum InvoiceStatus {
  DRAFT    = 'draft',
  OPEN     = 'open',
  PAID     = 'paid',
  UNCOLLECTIBLE = 'uncollectible',
  VOID     = 'void',
}

@Entity('invoices')
@Index(['orgId'])
@Index(['stripeInvoiceId'], { unique: true, where: '"stripe_invoice_id" IS NOT NULL' })
export class Invoice extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', nullable: false })
  orgId!: string;

  @Column({ name: 'stripe_invoice_id', type: 'varchar', length: 255, nullable: true })
  stripeInvoiceId!: string | null;

  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 255, nullable: true })
  stripeCustomerId!: string | null;

  @Column({ name: 'amount_paid', type: 'integer', default: 0 })
  amountPaid!: number; // in cents

  @Column({ name: 'amount_due', type: 'integer', default: 0 })
  amountDue!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'status', type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ name: 'invoice_pdf', type: 'varchar', length: 1000, nullable: true })
  invoicePdf!: string | null;

  @Column({ name: 'hosted_invoice_url', type: 'varchar', length: 1000, nullable: true })
  hostedInvoiceUrl!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
  periodStart!: Date | null;

  @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
  periodEnd!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;
}
