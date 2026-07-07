import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('feature_flag_overrides')
@Unique(['flagKey', 'orgId'])
@Index(['orgId'])
export class FeatureFlagOverride {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'flag_key', type: 'varchar', length: 100 }) flagKey!: string;
  @Column({ name: 'org_id', type: 'uuid', nullable: true }) orgId!: string | null;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId!: string | null;
  @Column({ type: 'boolean', nullable: false }) enabled!: boolean;
}
