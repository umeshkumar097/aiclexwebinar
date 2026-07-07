import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebinarsTable1751000000004 implements MigrationInterface {
  name = 'CreateWebinarsTable1751000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."webinars_status_enum" AS ENUM('draft', 'scheduled', 'live', 'ended', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."webinars_mode_enum" AS ENUM('semi_live', 'fully_live');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webinars" (
        "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
        "organization_id"  UUID,
        "host_user_id"     UUID NOT NULL,
        "title"            VARCHAR(255) NOT NULL,
        "description"      TEXT,
        "join_code"        VARCHAR(10) UNIQUE,
        "password"         VARCHAR(100),
        "status"           "public"."webinars_status_enum" NOT NULL DEFAULT 'draft',
        "mode"             "public"."webinars_mode_enum" NOT NULL DEFAULT 'semi_live',
        "scheduled_at"     TIMESTAMPTZ,
        "started_at"       TIMESTAMPTZ,
        "ended_at"         TIMESTAMPTZ,
        "duration_minutes" INTEGER NOT NULL DEFAULT 60,
        "max_attendees"    INTEGER NOT NULL DEFAULT 100,
        "registered_count" INTEGER NOT NULL DEFAULT 0,
        "attendee_count"   INTEGER NOT NULL DEFAULT 0,
        "thumbnail_url"    TEXT,
        "replay_url"       TEXT,
        "settings"         JSONB NOT NULL DEFAULT '{}',
        "livekit_room"     VARCHAR(255),
        "video_url"        TEXT,
        "timed_events"     JSONB NOT NULL DEFAULT '[]',
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webinars" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webinars_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_webinars_host_user" FOREIGN KEY ("host_user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_webinars_organization_id" ON "webinars" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_webinars_host_user_id" ON "webinars" ("host_user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_webinars_status" ON "webinars" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webinars"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."webinars_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."webinars_mode_enum"`);
  }
}
