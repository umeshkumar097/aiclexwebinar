import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppConfig } from '../config/configuration';
import { CacheService } from './cache.service';
import { REDIS_CLIENT, QUEUE_REDIS_CLIENT } from './redis.tokens';

// Re-export tokens so existing imports from redis.module still work
export { REDIS_CLIENT, QUEUE_REDIS_CLIENT } from './redis.tokens';

const createRedisClient = (
  host: string,
  port: number,
  password: string,
  db: number,
  name: string,
): Redis => {
  const client = new Redis({
    host,
    port,
    password: password || undefined,
    db,
    maxRetriesPerRequest: null, // Required for BullMQ compatibility
    enableReadyCheck: false,
    lazyConnect: false,
  });

  client.on('connect', () => {
    console.info(`✅ Redis [${name}] connected at ${host}:${port}`);
  });

  client.on('error', (error: Error) => {
    console.error(`❌ Redis [${name}] error:`, error.message);
  });

  return client;
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>): Redis => {
        const redis = configService.get('redis', { infer: true });
        return createRedisClient(redis.host, redis.port, redis.password, redis.db, 'App');
      },
    },
    {
      provide: QUEUE_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>): Redis => {
        const queue = configService.get('queue', { infer: true });
        return createRedisClient(queue.host, queue.port, queue.password, queue.db, 'Queue');
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, QUEUE_REDIS_CLIENT, CacheService],
})
export class RedisModule {}
