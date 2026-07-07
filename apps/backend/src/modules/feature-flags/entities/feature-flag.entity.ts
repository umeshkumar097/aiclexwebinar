import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/base.entity';

@Entity('feature_flags')
@Index(['key'], { unique: true })
export class FeatureFlag extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true }) key!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @Column({ name: 'enabled_globally', type: 'boolean', default: false }) enabledGlobally!: boolean;
}
