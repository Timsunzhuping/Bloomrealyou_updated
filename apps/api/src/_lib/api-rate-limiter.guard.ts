import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

interface ResponseLike {
  setHeader?(name: string, value: string | number): void;
}

interface Bucket {
  /** Tokens currently available. */
  tokens: number;
  /** Last refill timestamp (ms). */
  refilledAt: number;
}

const DEFAULT_BURST = 120;
const DEFAULT_REFILL_PER_SEC = 10;
const PRUNE_AT = 50_000;
const PRUNE_CUTOFF_MS = 10 * 60 * 1000; // 10 min

/**
 * Lightweight per-IP token-bucket guard meant to apply globally to the API.
 *
 * Defaults at 120 burst / 10 rps are deliberately generous — the goal is to
 * blunt scraping / scripted abuse rather than throttle real users. Tune via
 * `API_RATE_LIMIT_BURST` / `API_RATE_LIMIT_REFILL_PER_SEC`. Webhook routes
 * keep their own (stricter) {@link WebhookRateLimiterGuard} so a shipping
 * carrier's bursts don't share the bucket with normal cart traffic.
 *
 * On exhaustion the guard sets `Retry-After` and throws 429.
 */
@Injectable()
export class ApiRateLimiterGuard implements CanActivate {
  private readonly log = new Logger(ApiRateLimiterGuard.name);
  private readonly buckets = new Map<string, Bucket>();
  private readonly burst: number;
  private readonly refillPerMs: number;

  constructor() {
    this.burst = positiveOrDefault(process.env.API_RATE_LIMIT_BURST, DEFAULT_BURST);
    const perSec = positiveOrDefault(
      process.env.API_RATE_LIMIT_REFILL_PER_SEC,
      DEFAULT_REFILL_PER_SEC,
    );
    this.refillPerMs = perSec / 1000;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequestLike>();
    const ip = extractIp(req) ?? 'unknown';
    const now = Date.now();
    const bucket = this.consume(ip, now);
    if (bucket.tokens >= 0) return true;

    const retryAfterSec = Math.max(1, Math.ceil(-bucket.tokens / (this.refillPerMs * 1000)));
    const res = ctx.switchToHttp().getResponse<ResponseLike>();
    res.setHeader?.('Retry-After', String(retryAfterSec));
    this.log.warn(`rate-limit ip=${ip} retry-after=${retryAfterSec}s`);
    throw new HttpException(
      { message: 'Too many requests', retryAfter: retryAfterSec },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private consume(ip: string, now: number): Bucket {
    let bucket = this.buckets.get(ip);
    if (!bucket) {
      bucket = { tokens: this.burst, refilledAt: now };
      this.buckets.set(ip, bucket);
    } else {
      const elapsed = now - bucket.refilledAt;
      bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * this.refillPerMs);
      bucket.refilledAt = now;
    }
    bucket.tokens -= 1;

    if (this.buckets.size > PRUNE_AT) this.prune(now);
    return bucket;
  }

  private prune(now: number): void {
    let removed = 0;
    for (const [ip, b] of this.buckets) {
      if (now - b.refilledAt > PRUNE_CUTOFF_MS) {
        this.buckets.delete(ip);
        removed += 1;
      }
    }
    if (removed > 0) this.log.log(`pruned ${removed} idle rate-limit buckets`);
  }
}

function positiveOrDefault(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function extractIp(req: RequestLike): string | null {
  const xff = req.headers['x-forwarded-for'];
  const xffStr = Array.isArray(xff) ? xff[0] : xff;
  if (typeof xffStr === 'string' && xffStr.length > 0) {
    return xffStr.split(',')[0]?.trim() ?? null;
  }
  if (typeof req.ip === 'string') return req.ip;
  return req.socket?.remoteAddress ?? null;
}
