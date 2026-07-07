import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';

@Entity('permissions')
@Index(['slug'], { unique: true })
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  module!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
