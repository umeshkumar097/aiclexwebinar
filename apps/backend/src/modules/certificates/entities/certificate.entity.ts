import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('certificates')
@Index(['registrationId'])
export class Certificate extends BaseEntity {
  @Column({ name: 'registration_id', type: 'uuid', nullable: false }) registrationId!: string;
  @Column({ name: 'template_id', type: 'uuid', nullable: false }) templateId!: string;
  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true }) pdfUrl!: string | null;
  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true }) issuedAt!: Date | null;
}
