import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseDeviceSessionLengths1751000000003 implements MigrationInterface {
  name = 'IncreaseDeviceSessionLengths1751000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE device_sessions ALTER COLUMN browser TYPE VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE device_sessions ALTER COLUMN os TYPE VARCHAR(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE device_sessions ALTER COLUMN os TYPE VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE device_sessions ALTER COLUMN browser TYPE VARCHAR(100)`);
  }
}
