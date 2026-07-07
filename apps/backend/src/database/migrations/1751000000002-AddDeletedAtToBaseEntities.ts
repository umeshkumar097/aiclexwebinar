import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToBaseEntities1751000000002 implements MigrationInterface {
  name = 'AddDeletedAtToBaseEntities1751000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user_credentials ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE gdpr_erasure_jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE host_onboarding_progress ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE feature_flag_overrides ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE webhook_deliveries DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE feature_flag_overrides DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE role_permissions DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE host_onboarding_progress DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE organization_members DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE gdpr_erasure_jobs DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE device_sessions DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE user_consents DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE user_credentials DROP COLUMN IF EXISTS deleted_at`);
  }
}
