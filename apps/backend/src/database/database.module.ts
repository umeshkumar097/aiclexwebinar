import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { AppConfig } from '../config/configuration';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { Certificate } from '../modules/certificates/entities/certificate.entity';
import { CertificateTemplate } from '../modules/certificates/entities/certificate-template.entity';
import { FeatureFlag } from '../modules/feature-flags/entities/feature-flag.entity';
import { FeatureFlagOverride } from '../modules/feature-flags/entities/feature-flag-override.entity';
import { License } from '../modules/licenses/entities/license.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { OrganizationBranding } from '../modules/organizations/entities/organization-branding.entity';
import { OrganizationMember } from '../modules/organizations/entities/organization-member.entity';
import { Permission } from '../modules/rbac/entities/permission.entity';
import { Role } from '../modules/rbac/entities/role.entity';
import { RolePermission } from '../modules/rbac/entities/role-permission.entity';
import { DeviceSession } from '../modules/auth/entities/device-session.entity';
import { GdprErasureJob } from '../modules/auth/entities/gdpr-erasure-job.entity';
import { UserConsent } from '../modules/auth/entities/user-consent.entity';
import { UserCredential } from '../modules/auth/entities/user-credential.entity';
import { User } from '../modules/auth/entities/user.entity';
import { UserProfile } from '../modules/auth/entities/user-profile.entity';
import { HostOnboardingProgress } from '../modules/organizations/entities/host-onboarding-progress.entity';
import { Webhook } from '../modules/webhooks/entities/webhook.entity';
import { WebhookDelivery } from '../modules/webhooks/entities/webhook-delivery.entity';
import { Export } from '../modules/exports/entities/export.entity';
import { Webinar } from '../modules/webinars/entities/webinar.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const db = configService.get('database', { infer: true });
        const nodeEnv = configService.get('app.env', { infer: true });

        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          database: db.name,
          username: db.user,
          password: db.password,
          ssl: db.ssl ? { rejectUnauthorized: true } : false,
          entities: [
            User,
            UserProfile,
            UserCredential,
            UserConsent,
            DeviceSession,
            GdprErasureJob,
            License,
            Organization,
            OrganizationBranding,
            OrganizationMember,
            HostOnboardingProgress,
            Role,
            Permission,
            RolePermission,
            FeatureFlag,
            FeatureFlagOverride,
            AuditLog,
            Notification,
            Webhook,
            WebhookDelivery,
            CertificateTemplate,
            Certificate,
            Export,
            Webinar,
          ],
          migrations: ['dist/database/migrations/*.js'],
          migrationsRun: false,
          synchronize: nodeEnv === 'development', // auto-create tables in dev; migrations in prod
          logging: nodeEnv === 'development' ? 'all' : ['error', 'warn'],
          extra: {
            max: 20,
            min: 2,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
