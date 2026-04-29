import { ApiRateLimiterGuard } from './api-rate-limiter.guard';

function makeCtx(ip: string): { ctx: Parameters<ApiRateLimiterGuard['canActivate']>[0]; res: { headers: Record<string, string>; setHeader: (k: string, v: string | number) => void } } {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    setHeader: (k: string, v: string | number): void => {
      headers[k] = String(v);
    },
  };
  const req = { headers: { 'x-forwarded-for': ip } };
  const ctx = {
    switchToHttp: () => ({
      getRequest: <T>(): T => req as unknown as T,
      getResponse: <T>(): T => res as unknown as T,
    }),
  } as unknown as Parameters<ApiRateLimiterGuard['canActivate']>[0];
  return { ctx, res };
}

describe('ApiRateLimiterGuard', () => {
  beforeEach(() => {
    process.env.API_RATE_LIMIT_BURST = '3';
    process.env.API_RATE_LIMIT_REFILL_PER_SEC = '0.0001';
  });

  it('lets the first burst-worth of requests through', () => {
    const guard = new ApiRateLimiterGuard();
    const { ctx } = makeCtx('1.2.3.4');
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws 429 with Retry-After once the bucket is empty', () => {
    const guard = new ApiRateLimiterGuard();
    const { ctx, res } = makeCtx('5.6.7.8');
    guard.canActivate(ctx);
    guard.canActivate(ctx);
    guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(/Too many requests/);
    expect(res.headers['Retry-After']).toBeDefined();
  });

  it('isolates buckets per IP', () => {
    const guard = new ApiRateLimiterGuard();
    const a = makeCtx('10.0.0.1');
    const b = makeCtx('10.0.0.2');
    guard.canActivate(a.ctx);
    guard.canActivate(a.ctx);
    guard.canActivate(a.ctx);
    expect(() => guard.canActivate(a.ctx)).toThrow();
    // B still has its full burst.
    expect(guard.canActivate(b.ctx)).toBe(true);
  });
});
