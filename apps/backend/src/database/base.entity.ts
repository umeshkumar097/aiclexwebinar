import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base entity for all tables.
 * Provides UUID primary key, timestamps, and soft-delete support.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

/**
 * Base entity for all organization-scoped tables.
 * All queries MUST include organization_id via OrgScopedRepository.
 */
export abstract class OrgScopedEntity extends BaseEntity {
  // organization_id is defined in each entity individually to allow custom column options
  // but this class serves as a TypeScript marker for org-scoped entities
}
