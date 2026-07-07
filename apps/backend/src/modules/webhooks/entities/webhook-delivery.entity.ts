import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Webhook } from './webhook.entity';

export enum DeliveryStatus { PENDING = 'pending', SUCCESS = 'success', FAILED = 'failed' }

@Entity('webhook_deliveries')
@Index(['webhookId'])
@Index(['status'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'webhook_id', type: 'uuid', nullable: false }) webhookId!: string;
  @Column({ name: 'event_type', type: 'varchar', length: 100 }) eventType!: string;
  @Column({ type: 'jsonb' }) payload!: unknown;
  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING }) status!: DeliveryStatus;
  @Column({ name: 'response_status', type: 'integer', nullable: true }) responseStatus!: number | null;
  @Column({ name: 'response_body', type: 'text', nullable: true }) responseBody!: string | null;
  @Column({ name: 'attempts', type: 'integer', default: 0 }) attempts!: number;
  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true }) nextRetryAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @ManyToOne(() => Webhook, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'webhook_id' }) webhook!: Webhook;
}
