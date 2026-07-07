// Worker process: runs BullMQ processors in isolation from the API server.
// Shares all modules but does NOT start the HTTP server.
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('Worker');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // Do NOT call app.listen() — this is a pure worker process
  logger.log('🔧 Zonvo Worker started — listening for jobs');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down worker...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
