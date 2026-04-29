import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

/**
 * Resolve the CORS allow-list. In dev (`API_CORS_ORIGINS` unset) we mirror
 * the request origin to ease local hacking; in production the env var must
 * list explicit origins (comma-separated) — anything else is rejected.
 */
function resolveCorsOrigin(): boolean | string[] {
  const raw = process.env.API_CORS_ORIGINS;
  if (!raw) return true;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: resolveCorsOrigin(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'authorization',
        'content-type',
        'x-admin-token',
        'x-cart-session',
        'stripe-signature',
        'x-easypost-hmac-signature',
        'x-shippo-signature',
        'x-17track-signature',
      ],
      exposedHeaders: ['x-cart-session', 'retry-after'],
    },
    rawBody: true,
  });
  // `whitelist: true` strips unknown DTO fields; `forbidNonWhitelisted` makes
  // the API reject them outright so attackers can't smuggle parameters past
  // class-validator. `transform` converts strings to declared types.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix(process.env.API_GLOBAL_PREFIX ?? '');

  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? '0.0.0.0';
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] failed to bootstrap', err);
  process.exit(1);
});
