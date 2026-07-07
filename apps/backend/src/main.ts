import 'reflect-metadata';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

import type { AppConfig } from './config/configuration';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { API_PREFIX } from '@zonvo/constants';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const adapter = new FastifyAdapter({
    logger: false,
    trustProxy: true,
    bodyLimit: 104857600, // 100MB
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('app.port', { infer: true });
  const nodeEnv = config.get('app.env', { infer: true });
  const isDev = nodeEnv === 'development';

  // ─── Security headers (inline — no plugin version conflict) ──────────────────
  app.getHttpAdapter().getInstance().addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!isDev) {
      reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }
  });

  // ─── Multipart (File Uploads) ─────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fastifyMultipart = require('@fastify/multipart');
    await app.register(fastifyMultipart, {
      limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    });
  } catch {
    logger.warn('@fastify/multipart not available — file uploads disabled');
  }

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: isDev
      ? ['http://localhost:3001', 'http://localhost:3000']
      : config.get('app.corsOrigins', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix(API_PREFIX);

  // ─── Global Pipes ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Filters ───────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global Interceptors ──────────────────────────────────────────────────
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ─── Swagger ──────────────────────────────────────────────────────────────
  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Zonvo API')
      .setDescription('Enterprise Semi-Live Webinar Platform — REST API Documentation')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-organization-id' }, 'org-id')
      .addTag('Auth', 'Authentication & session management')
      .addTag('Organizations', 'Organization management')
      .addTag('Users', 'User management')
      .addTag('Webinars', 'Webinar CRUD & lifecycle')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none', filter: true },
    });

    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }

  // ─── Start ────────────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Zonvo API running on: http://localhost:${port}/${API_PREFIX}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
