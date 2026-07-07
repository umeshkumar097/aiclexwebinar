import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the default roles, permissions, and system license plans.
 * Run once after Phase1InitialSchema migration.
 */
export class Phase1SeedRolesPermissions1751000000001 implements MigrationInterface {
  name = 'Phase1SeedRolesPermissions1751000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Licenses ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO licenses (id, name, slug, max_webinars, max_attendees_per_webinar, max_hosts, max_storage_gb, features, price_monthly_cents, price_annual_cents, currency)
      VALUES
        (uuid_generate_v4(), 'Free',       'free',       3,    100,  1,   5,    '["webinar","recording","basic_analytics"]'::jsonb, 0,      0,      'USD'),
        (uuid_generate_v4(), 'Starter',    'starter',    10,   500,  2,   20,   '["webinar","recording","analytics","email_notifications","custom_branding"]'::jsonb, 2900, 29000, 'USD'),
        (uuid_generate_v4(), 'Pro',        'pro',        50,   2000, 5,   100,  '["webinar","recording","analytics","email_notifications","custom_branding","whatsapp","webhooks","api_access","certificate"]'::jsonb, 9900, 99000, 'USD'),
        (uuid_generate_v4(), 'Business',   'business',   NULL, NULL, 20,  500,  '["webinar","recording","analytics","email_notifications","custom_branding","whatsapp","webhooks","api_access","certificate","white_label","multi_org","priority_support"]'::jsonb, 29900, 299000, 'USD'),
        (uuid_generate_v4(), 'Enterprise', 'enterprise', NULL, NULL, NULL,NULL, '["all"]'::jsonb, NULL, NULL, 'USD')
      ON CONFLICT (slug) DO NOTHING
    `);

    // ─── Roles ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO roles (id, name, slug, description, is_system, display_order)
      VALUES
        (uuid_generate_v4(), 'Super Admin',      'super_admin',      'Platform-level super administrator', TRUE,  0),
        (uuid_generate_v4(), 'Platform Admin',   'platform_admin',   'Platform administration staff',      TRUE,  1),
        (uuid_generate_v4(), 'Support',          'support',          'Customer support agent',             TRUE,  2),
        (uuid_generate_v4(), 'Sales',            'sales',            'Sales team member',                  TRUE,  3),
        (uuid_generate_v4(), 'Partner',          'partner',          'Reseller/partner account',           TRUE,  4),
        (uuid_generate_v4(), 'Organization Admin','org_admin',       'Organization administrator',          FALSE, 10),
        (uuid_generate_v4(), 'Host',             'host',             'Webinar host/creator',               FALSE, 11),
        (uuid_generate_v4(), 'Moderator',        'moderator',        'Webinar moderator',                  FALSE, 12),
        (uuid_generate_v4(), 'Member',           'member',           'Regular organization member',         FALSE, 13),
        (uuid_generate_v4(), 'Registered User',  'registered_user',  'Verified registered user',           FALSE, 20),
        (uuid_generate_v4(), 'Guest',            'guest',            'Unauthenticated guest visitor',       FALSE, 30)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ─── Permissions (Grouped by Module) ──────────────────────────────────────
    const modules = [
      // Auth
      ['users:read', 'Read Users', 'auth'],
      ['users:create', 'Create Users', 'auth'],
      ['users:update', 'Update Users', 'auth'],
      ['users:delete', 'Delete Users', 'auth'],
      ['users:suspend', 'Suspend Users', 'auth'],
      ['users:impersonate', 'Impersonate Users', 'auth'],

      // Organizations
      ['orgs:read', 'Read Organizations', 'organizations'],
      ['orgs:create', 'Create Organizations', 'organizations'],
      ['orgs:update', 'Update Organizations', 'organizations'],
      ['orgs:delete', 'Delete Organizations', 'organizations'],
      ['orgs:members:invite', 'Invite Members', 'organizations'],
      ['orgs:members:remove', 'Remove Members', 'organizations'],
      ['orgs:members:update_role', 'Update Member Roles', 'organizations'],
      ['orgs:branding:update', 'Update Organization Branding', 'organizations'],

      // Webinars
      ['webinars:read', 'Read Webinars', 'webinars'],
      ['webinars:create', 'Create Webinars', 'webinars'],
      ['webinars:update', 'Update Webinars', 'webinars'],
      ['webinars:delete', 'Delete Webinars', 'webinars'],
      ['webinars:publish', 'Publish Webinars', 'webinars'],
      ['webinars:unpublish', 'Unpublish Webinars', 'webinars'],
      ['webinars:duplicate', 'Duplicate Webinars', 'webinars'],

      // Recordings
      ['recordings:read', 'Read Recordings', 'recordings'],
      ['recordings:upload', 'Upload Recordings', 'recordings'],
      ['recordings:delete', 'Delete Recordings', 'recordings'],
      ['recordings:replace', 'Replace Recordings', 'recordings'],

      // Live Sessions
      ['live:start', 'Start Live Takeover', 'live'],
      ['live:end', 'End Live Takeover', 'live'],
      ['live:moderate', 'Moderate Live Chat/Q&A', 'live'],

      // Registrations
      ['registrations:read', 'Read Registrations', 'registrations'],
      ['registrations:export', 'Export Registrations', 'registrations'],
      ['registrations:delete', 'Delete Registrations (GDPR)', 'registrations'],

      // Analytics
      ['analytics:read', 'Read Analytics', 'analytics'],
      ['analytics:export', 'Export Analytics', 'analytics'],

      // Notifications
      ['notifications:read', 'Read Notifications', 'notifications'],
      ['notifications:send', 'Send Notifications', 'notifications'],
      ['notifications:templates:manage', 'Manage Notification Templates', 'notifications'],

      // Webhooks
      ['webhooks:read', 'Read Webhooks', 'webhooks'],
      ['webhooks:create', 'Create Webhooks', 'webhooks'],
      ['webhooks:update', 'Update Webhooks', 'webhooks'],
      ['webhooks:delete', 'Delete Webhooks', 'webhooks'],

      // Certificates
      ['certificates:read', 'Read Certificates', 'certificates'],
      ['certificates:issue', 'Issue Certificates', 'certificates'],
      ['certificates:templates:manage', 'Manage Certificate Templates', 'certificates'],

      // Audit
      ['audit:read', 'Read Audit Logs', 'audit'],

      // RBAC
      ['roles:read', 'Read Roles', 'rbac'],
      ['roles:manage', 'Manage Roles and Permissions', 'rbac'],

      // Feature Flags
      ['feature_flags:read', 'Read Feature Flags', 'platform'],
      ['feature_flags:manage', 'Manage Feature Flags', 'platform'],

      // Licenses
      ['licenses:read', 'Read Licenses', 'platform'],
      ['licenses:manage', 'Manage License Plans', 'platform'],

      // Exports
      ['exports:create', 'Create Data Exports', 'exports'],
      ['exports:download', 'Download Exports', 'exports'],

      // Platform (super admin)
      ['platform:manage', 'Full Platform Management', 'platform'],
      ['platform:impersonate', 'Impersonate Any User', 'platform'],
    ];

    for (const [slug, name, module] of modules) {
      await queryRunner.query(`
        INSERT INTO permissions (id, name, slug, module)
        VALUES (uuid_generate_v4(), $1, $2, $3)
        ON CONFLICT (slug) DO NOTHING
      `, [name, slug, module]);
    }

    // ─── Role-Permission Assignments ──────────────────────────────────────────
    // Super Admin gets all permissions
    await queryRunner.query(`
      INSERT INTO role_permissions (id, role_id, permission_id)
      SELECT uuid_generate_v4(), r.id, p.id
      FROM roles r, permissions p
      WHERE r.slug = 'super_admin'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // Platform Admin gets all except impersonate
    await queryRunner.query(`
      INSERT INTO role_permissions (id, role_id, permission_id)
      SELECT uuid_generate_v4(), r.id, p.id
      FROM roles r, permissions p
      WHERE r.slug = 'platform_admin'
        AND p.slug != 'platform:impersonate'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // Org Admin gets all org-level permissions
    const orgAdminPerms = [
      'users:read', 'orgs:read', 'orgs:update', 'orgs:members:invite', 'orgs:members:remove',
      'orgs:members:update_role', 'orgs:branding:update', 'webinars:read', 'webinars:create',
      'webinars:update', 'webinars:delete', 'webinars:publish', 'webinars:unpublish',
      'webinars:duplicate', 'recordings:read', 'recordings:upload', 'recordings:delete',
      'recordings:replace', 'live:start', 'live:end', 'live:moderate', 'registrations:read',
      'registrations:export', 'registrations:delete', 'analytics:read', 'analytics:export',
      'notifications:read', 'notifications:send', 'notifications:templates:manage',
      'webhooks:read', 'webhooks:create', 'webhooks:update', 'webhooks:delete',
      'certificates:read', 'certificates:issue', 'certificates:templates:manage',
      'audit:read', 'roles:read', 'exports:create', 'exports:download',
    ];
    for (const perm of orgAdminPerms) {
      await queryRunner.query(`
        INSERT INTO role_permissions (id, role_id, permission_id)
        SELECT uuid_generate_v4(), r.id, p.id
        FROM roles r, permissions p
        WHERE r.slug = 'org_admin' AND p.slug = $1
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [perm]);
    }

    // Host
    const hostPerms = [
      'webinars:read', 'webinars:create', 'webinars:update', 'webinars:delete',
      'webinars:publish', 'webinars:unpublish', 'webinars:duplicate',
      'recordings:read', 'recordings:upload', 'recordings:delete', 'recordings:replace',
      'live:start', 'live:end', 'live:moderate',
      'registrations:read', 'registrations:export',
      'analytics:read', 'certificates:read', 'certificates:issue',
      'notifications:read', 'exports:create', 'exports:download',
    ];
    for (const perm of hostPerms) {
      await queryRunner.query(`
        INSERT INTO role_permissions (id, role_id, permission_id)
        SELECT uuid_generate_v4(), r.id, p.id
        FROM roles r, permissions p
        WHERE r.slug = 'host' AND p.slug = $1
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [perm]);
    }

    // Moderator
    const modPerms = ['live:moderate', 'registrations:read', 'webinars:read', 'notifications:read'];
    for (const perm of modPerms) {
      await queryRunner.query(`
        INSERT INTO role_permissions (id, role_id, permission_id)
        SELECT uuid_generate_v4(), r.id, p.id
        FROM roles r, permissions p
        WHERE r.slug = 'moderator' AND p.slug = $1
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [perm]);
    }

    // Feature Flags defaults
    await queryRunner.query(`
      INSERT INTO feature_flags (id, key, description, enabled_globally)
      VALUES
        (uuid_generate_v4(), 'live_takeover',          'Enable hybrid live takeover feature',        TRUE),
        (uuid_generate_v4(), 'webinar_certificates',   'Enable certificate issuance for webinars',   TRUE),
        (uuid_generate_v4(), 'whatsapp_notifications', 'Enable WhatsApp notification channel',       FALSE),
        (uuid_generate_v4(), 'analytics_v2',           'Enable advanced analytics dashboard',        FALSE),
        (uuid_generate_v4(), 'white_label',            'Enable white-label branding features',       FALSE)
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM role_permissions`);
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`DELETE FROM roles`);
    await queryRunner.query(`DELETE FROM licenses`);
    await queryRunner.query(`DELETE FROM feature_flags`);
  }
}
