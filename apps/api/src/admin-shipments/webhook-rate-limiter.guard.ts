import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface Bucket {
  /** Tokens currently available, fractional. */
  tokens: number;
  /** Last time we refilled the bucket (ms). */
  refilledAt: number;
}

interface RequestLike {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface ResponseLike {
  setHeader?(name: string, value: string | number): void;
  header?(name: string, value: string | number): void;
}

/**
 * Token-bucket rate limiter for the webhook endpoints.
 *
 * Carriers occasionally fan out a burst — say, when their queue catches up
 * after an outage — and a misbehaving partner can DoS our cluster. This guard
 * caps each remote IP at `WEBHOOK_RATE_LIMIT_BURST` requests (default 60),
 * with the bucket refilled at `WEBHOOK_RATE_LIMIT_REFILL_PER_SEC` tokens
 * per second (default 1).
 *
 * On exhaustion we set the `Retry-After` response header to the seconds
 * until one token replenishes, then throw 429. The header lets the carrier
 * back off without spinning. Modern carriers (EasyPost / Shippo / 17track)
 * all honour this header.
 */
@Injectable()
export class WebhookRateLimiterGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly burst = Number(process.env.WEBHOOK_RATE_LIMIT_BURST ?? 60);
  private readonly refillPerSec = Number(process.env.WEBHOOK_RATE_LIMIT_REFILL_PER_SEC ?? 1);

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestLike>();
    const res = http.getResponse<ResponseLike>();
    const ip = clientIp(req);
    const now = Date.now();

    let bucket = this.buckets.get(ip);
    if (!bucket) {
      bucket = { tokens: this.burst, refilledAt: now };
      this.buckets.set(ip, bucket);
    } else {
      const elapsed = (now - bucket.refilledAt) / 1000;
      bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * this.refillPerSec);
      bucket.refilledAt = now;
    }

    if (bucket.tokens < 1) {
      const secondsUntilOne = Math.max(1, Math.ceil((1 - bucket.tokens) / this.refillPerSec));
      // Stamp Retry-After before throwing — Nest's exception filter lets the
      // header pass through to the response when set this way.
      if (typeof res.setHeader === 'function') res.setHeader('Retry-After', secondsUntilOne);
      else if (typeof res.header === 'function') res.header('Retry-After', secondsUntilOne);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Webhook rate limit exceeded',
          retryAfter: secondsUntilOne,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.tokens -= 1;

    // Periodically prune cold buckets so the Map doesn't grow unbounded.
    if (this.buckets.size > 10_000) this.pruneStale();
    return true;
  }

  /** Test helper. */
  reset(): void {
    this.buckets.clear();
  }

  private pruneStale(): void {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1h
    for (const [ip, b] of this.buckets.entries()) {
      if (b.refilledAt < cutoff) this.buckets.delete(ip);
    }
  }
}

function clientIp(req: RequestLike): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0]!.trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0]!.split(',')[0]!.trim();
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
