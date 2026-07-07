import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

export enum WebhookStatus { ACTIVE = 'active', INACTIVE = 'inactive' }

@Entity('webhooks')
@Index(['orgId'])
export class Webhook extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', nullable: false })
  orgId!: string;
  @Column({ name: 'endpoint_url', type: 'varchar', length: 500, nullable: false })
  endpointUrl!: string;
  @Column({ name: 'secret_hash', type: 'varchar', length: 255, nullable: false })
  secretHash!: string;
  @Column({ type: 'jsonb', default: [] })
  events!: string[];
  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.ACTIVE })
  status!: WebhookStatus;
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}
