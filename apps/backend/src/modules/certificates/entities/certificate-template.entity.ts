import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('certificate_templates')
@Index(['orgId'])
export class CertificateTemplate extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid', nullable: false }) orgId!: string;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'text', nullable: true }) htmlTemplate!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
}
