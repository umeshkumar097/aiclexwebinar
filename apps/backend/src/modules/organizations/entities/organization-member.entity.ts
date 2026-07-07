import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Role } from '../../rbac/entities/role.entity';
import { Organization } from './organization.entity';

@Entity('organization_members')
@Unique(['orgId', 'userId'])
@Index(['userId'])
@Index(['orgId'])
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid', nullable: false })
  orgId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: false })
  roleId!: string;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy!: string | null;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;

  @ManyToOne(() => Organization, (org) => org.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
