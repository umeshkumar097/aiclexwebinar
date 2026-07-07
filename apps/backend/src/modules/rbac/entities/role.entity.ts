import { Column, Entity, Index, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../database/base.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
@Index(['slug'], { unique: true })
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: true })
  isSystem!: boolean;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder!: number;

  @OneToMany(() => RolePermission, (rp) => rp.role, { eager: false })
  rolePermissions!: RolePermission[];
}
