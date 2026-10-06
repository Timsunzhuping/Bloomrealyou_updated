import { lookup } from 'node:dns/promises';
import { EventEmitter } from 'node:events';
import { request } from 'node:https';

import { ConfigService } from '@nestjs/config';

import { ModelTransport, type RuntimeModel } from './model-transport.service';

import type { ClientRequest, IncomingMessage } from 'node:http';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));
jest.mock('node:https', () => ({ request: jest.fn() }));
const dns = jest.mocked(lookup),
  http = jest.mocked(request);
const profile: RuntimeModel = {
  id: 'test',
  provider: 'doubao',
  kind: 'text',
  model: 'test-model',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: 'test-only-placeholder',
  timeoutMs: 5000,
};
describe('Model transport network boundary', () => {
  const transport = new ModelTransport(new ConfigService());
  beforeEach(() => {
    jest.resetAllMocks();
  });
  const respond = (status: number, value: unknown) =>
    http.mockImplementation((_url, _options, callback) => {
      const req = new EventEmitter() as ClientRequest;
      req.end = jest.fn(() => {
        queueMicrotask(() => {
          const res = new EventEmitter() as IncomingMessage;
          res.statusCode = status;
          res.destroy = jest.fn();
          callback!(res);
          res.emit('data', Buffer.from(JSON.stringify(value)));
          res.emit('end');
        });
        return req;
      }) as ClientRequest['end'];
      req.destroy = jest.fn(() => req);
      return req;
    });
  it('blocks DNS answers containing internal or metadata IPs before sending any credential', async () => {
    dns.mockResolvedValueOnce([
      { address: '1.1.1.1', family: 4 },
      { address: '169.254.169.254', family: 4 },
    ] as never);
    await expect(transport.chat(profile, { messages: [] })).rejects.toMatchObject({
      response: { code: 'MODEL_ENDPOINT_BLOCKED' },
    });
    expect(http).not.toHaveBeenCalled();
  });
  it('pins the public DNS answer while preserving the original TLS hostname', async () => {
    dns.mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }] as never);
    respond(200, { choices: [{ message: { content: 'OK' } }] });
    expect((await transport.chat(profile, { messages: [] })).choices?.[0]?.message?.content).toBe(
      'OK',
    );
    const [url, options] = http.mock.calls[0]!;
    expect(String(url)).toBe(`${profile.baseUrl}/chat/completions`);
    expect(options).toMatchObject({ family: 4, agent: false });
    const cb = jest.fn();
    options.lookup!('ark.cn-beijing.volces.com', {}, cb);
    expect(cb).toHaveBeenCalledWith(null, '1.1.1.1', 4);
    expect(dns).toHaveBeenCalledTimes(1);
  });
  it('never follows a redirect to a second host', async () => {
    dns.mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }] as never);
    respond(302, {});
    await expect(transport.chat(profile, { messages: [] })).rejects.toMatchObject({
      response: { code: 'MODEL_UPSTREAM_FAILED' },
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('bounds a stalled DNS resolution without sending credentials', async () => {
    jest.useFakeTimers();
    try {
      dns.mockImplementationOnce(() => new Promise(() => {}) as never);
      const result = expect(transport.chat(profile, { messages: [] })).rejects.toMatchObject({
        response: { code: 'MODEL_NETWORK_FAILED' },
      });
      await jest.advanceTimersByTimeAsync(5000);
      await result;
      expect(http).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
  it('does not crash when an upstream returns an empty 204 response', async () => {
    dns.mockResolvedValueOnce([{ address: '1.1.1.1', family: 4 }] as never);
    respond(204, {});
    await expect(transport.chat(profile, { messages: [] })).rejects.toMatchObject({
      response: { code: 'MODEL_RESPONSE_INVALID' },
    });
  });
});
