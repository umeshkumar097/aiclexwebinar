import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates all Phase 1 tables:
 * users, user_profiles, user_credentials, user_consents,
 * device_sessions, gdpr_erasure_jobs,
 * licenses, organizations, organization_branding, organization_members,
 * host_onboarding_progress,
 * roles, permissions, role_permissions,
 * feature_flags, feature_flag_overrides,
 * audit_logs (partitioned),
 * notifications, webhooks, webhook_deliveries,
 * certificate_templates, certificates, exports
 */
export class Phase1InitialSchema1751000000000 implements MigrationInterface {
  name = 'Phase1InitialSchema1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enable Extensions ────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ─── ENUM Types ───────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted')`);
    await queryRunner.query(`CREATE TYPE device_type AS ENUM ('desktop', 'tablet', 'mobile', 'unknown')`);
    await queryRunner.query(`CREATE TYPE gdpr_job_status AS ENUM ('pending', 'processing', 'completed', 'failed')`);
    await queryRunner.query(`CREATE TYPE org_status AS ENUM ('active', 'suspended', 'cancelled')`);
    await queryRunner.query(`CREATE TYPE notification_type AS ENUM ('email', 'whatsapp', 'in_app', 'push')`);
    await queryRunner.query(`CREATE TYPE notification_status AS ENUM ('pending', 'queued', 'sent', 'failed', 'read')`);
    await queryRunner.query(`CREATE TYPE webhook_status AS ENUM ('active', 'inactive')`);
    await queryRunner.query(`CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'success', 'failed')`);
    await queryRunner.query(`CREATE TYPE export_type AS ENUM ('registrations', 'attendees', 'analytics', 'audit_log')`);
    await queryRunner.query(`CREATE TYPE export_status AS ENUM ('pending', 'processing', 'ready', 'failed', 'expired')`);

    // ─── Users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL,
        status user_status NOT NULL DEFAULT 'pending',
        email_verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_users_status ON users(status)`);

    // ─── User Profiles ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        avatar_url VARCHAR(500),
        avatar_storage_key VARCHAR(500),
        phone VARCHAR(30),
        bio TEXT,
        timezone VARCHAR(60) NOT NULL DEFAULT 'UTC',
        locale VARCHAR(10) NOT NULL DEFAULT 'en',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE(user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id)`);

    // ─── User Credentials ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE user_credentials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // ─── User Consents ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE user_consents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        consent_type VARCHAR(50) NOT NULL,
        version VARCHAR(20) NOT NULL,
        granted BOOLEAN NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_user_consents_user_id_type ON user_consents(user_id, consent_type)`);

    // ─── Device Sessions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE device_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        device_type device_type NOT NULL DEFAULT 'unknown',
        browser VARCHAR(100),
        os VARCHAR(100),
        ip_address VARCHAR(45),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(refresh_token_hash)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_device_sessions_user_id ON device_sessions(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_device_sessions_revoked ON device_sessions(revoked_at) WHERE revoked_at IS NULL`);

    // ─── GDPR Erasure Jobs ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE gdpr_erasure_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        requested_by UUID,
        reason TEXT,
        status gdpr_job_status NOT NULL DEFAULT 'pending',
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_gdpr_jobs_status ON gdpr_erasure_jobs(status)`);

    // ─── Licenses ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE licenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        max_webinars INTEGER,
        max_attendees_per_webinar INTEGER,
        max_hosts INTEGER,
        max_storage_gb INTEGER,
        features JSONB NOT NULL DEFAULT '[]',
        price_monthly_cents INTEGER,
        price_annual_cents INTEGER,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    // ─── Organizations ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        logo_url VARCHAR(500),
        logo_storage_key VARCHAR(500),
        license_id UUID NOT NULL REFERENCES licenses(id),
        owner_id UUID NOT NULL REFERENCES users(id),
        status org_status NOT NULL DEFAULT 'active',
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_organizations_owner ON organizations(owner_id)`);
    await queryRunner.query(`CREATE INDEX idx_organizations_license ON organizations(license_id)`);

    // ─── Organization Branding ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE organization_branding (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        primary_color VARCHAR(7),
        logo_url VARCHAR(500),
        favicon_url VARCHAR(500),
        custom_domain VARCHAR(255),
        email_sender_name VARCHAR(100),
        email_sender_address VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(org_id)
      )
    `);

    // ─── Organization Members ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE organization_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL,
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_org_members_user_id ON organization_members(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_org_members_org_id ON organization_members(org_id)`);

    // ─── Host Onboarding Progress ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE host_onboarding_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
        first_webinar_created BOOLEAN NOT NULL DEFAULT FALSE,
        first_recording_uploaded BOOLEAN NOT NULL DEFAULT FALSE,
        branding_configured BOOLEAN NOT NULL DEFAULT FALSE,
        email_configured BOOLEAN NOT NULL DEFAULT FALSE,
        first_webinar_live BOOLEAN NOT NULL DEFAULT FALSE,
        dismissed_at TIMESTAMPTZ,
        UNIQUE(org_id)
      )
    `);

    // ─── Roles ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_system BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    // ─── Permissions ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        module VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    // ─── Role Permissions ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE role_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
      )
    `);

    // Add FK from org_members to roles (after roles created)
    await queryRunner.query(`
      ALTER TABLE organization_members
      ADD CONSTRAINT fk_org_members_role
      FOREIGN KEY (role_id) REFERENCES roles(id)
    `);

    // ─── Feature Flags ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE feature_flags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        enabled_globally BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE feature_flag_overrides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        flag_key VARCHAR(100) NOT NULL,
        org_id UUID,
        user_id UUID,
        enabled BOOLEAN NOT NULL,
        UNIQUE(flag_key, org_id)
      )
    `);

    // ─── Audit Logs (Partitioned) ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID DEFAULT uuid_generate_v4(),
        actor_id UUID,
        actor_email VARCHAR(255),
        actor_ip VARCHAR(45),
        org_id UUID,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID,
        before_state JSONB,
        after_state JSONB,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at)
    `);

    // Create 2026 monthly partitions
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    for (const m of months) {
      const nextM = String(parseInt(m, 10) + 1).padStart(2, '0');
      const nextY = nextM === '13' ? '2027' : '2026';
      const endM = nextM === '13' ? '01' : nextM;
      await queryRunner.query(`
        CREATE TABLE audit_logs_2026_${m} PARTITION OF audit_logs
        FOR VALUES FROM ('2026-${m}-01') TO ('${nextY}-${endM}-01')
      `);
    }

    // Default partition for 2027+
    await queryRunner.query(`
      CREATE TABLE audit_logs_2027 PARTITION OF audit_logs
      FOR VALUES FROM ('2027-01-01') TO ('2028-01-01')
    `);

    await queryRunner.query(`CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_org ON audit_logs(org_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_action ON audit_logs(action)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created ON audit_logs(created_at)`);

    // ─── Notifications ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        org_id UUID,
        to_address VARCHAR(255),
        type notification_type NOT NULL,
        template_key VARCHAR(100) NOT NULL,
        variables JSONB NOT NULL DEFAULT '{}',
        status notification_status NOT NULL DEFAULT 'pending',
        provider_id VARCHAR(255),
        error_message TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        scheduled_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_org ON notifications(org_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_status ON notifications(status)`);

    // ─── Webhooks ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        endpoint_url VARCHAR(500) NOT NULL,
        secret_hash VARCHAR(255) NOT NULL,
        events JSONB NOT NULL DEFAULT '[]',
        status webhook_status NOT NULL DEFAULT 'active',
        description VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_webhooks_org ON webhooks(org_id)`);

    await queryRunner.query(`
      CREATE TABLE webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status webhook_delivery_status NOT NULL DEFAULT 'pending',
        response_status INTEGER,
        response_body TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_retry_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id)`);
    await queryRunner.query(`CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status)`);

    // ─── Certificates (hooks) ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE certificate_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        html_template TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE certificates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        registration_id UUID NOT NULL,
        template_id UUID NOT NULL REFERENCES certificate_templates(id),
        pdf_url VARCHAR(500),
        issued_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    // ─── Exports ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE exports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL,
        requested_by UUID NOT NULL REFERENCES users(id),
        type export_type NOT NULL,
        status export_status NOT NULL DEFAULT 'pending',
        filters JSONB NOT NULL DEFAULT '{}',
        storage_key VARCHAR(500),
        row_count INTEGER,
        expires_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_exports_org ON exports(org_id)`);
    await queryRunner.query(`CREATE INDEX idx_exports_user ON exports(requested_by)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS exports`);
    await queryRunner.query(`DROP TABLE IF EXISTS certificates`);
    await queryRunner.query(`DROP TABLE IF EXISTS certificate_templates`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_deliveries`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhooks`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs_2027`);
    const months = ['12','11','10','09','08','07','06','05','04','03','02','01'];
    for (const m of months) {
      await queryRunner.query(`DROP TABLE IF EXISTS audit_logs_2026_${m}`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flag_overrides`);
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flags`);
    await queryRunner.query(`ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_org_members_role`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS host_onboarding_progress`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_branding`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
    await queryRunner.query(`DROP TABLE IF EXISTS licenses`);
    await queryRunner.query(`DROP TABLE IF EXISTS gdpr_erasure_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS device_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_consents`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_credentials`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TYPE IF EXISTS export_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS export_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS webhook_delivery_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS webhook_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS org_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS gdpr_job_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS device_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_status`);
  }
}
