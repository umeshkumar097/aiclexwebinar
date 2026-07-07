import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import type { AppConfig } from './config/configuration';
import { configuration } from './config/configuration';
import { validate } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';

// ─── Feature Modules ──────────────────────────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { WebinarsModule } from './modules/webinars/webinars.module';

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),

    // ─── Throttler ───────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: config.get('app.rateLimitPerMinute', { infer: true }),
          },
        ],
        storage: undefined, // default in-memory; replace with Redis storage for multi-pod
      }),
    }),

    // ─── Database ────────────────────────────────────────────────────────────
    DatabaseModule,

    // ─── Redis ───────────────────────────────────────────────────────────────
    RedisModule,

    // ─── BullMQ ──────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        connection: {
          host: config.get('redis.host', { infer: true }),
          port: config.get('redis.port', { infer: true }),
          password: config.get('redis.password', { infer: true }) || undefined,
          db: config.get('redis.db', { infer: true }),
          tls: config.get('redis.tls', { infer: true }) ? {} : undefined,
        },
        defaultJobOptions: {
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 100 },
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
        },
      }),
    }),

    // ─── Infrastructure ──────────────────────────────────────────────────────
    AuditModule,
    NotificationsModule,
    StorageModule,

    // ─── Domain ──────────────────────────────────────────────────────────────
    AuthModule,
    OrganizationsModule,
    UsersModule,
    LicensesModule,
    WebhooksModule,
    FeatureFlagsModule,
    WebinarsModule,

    // ─── System ──────────────────────────────────────────────────────────────
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
