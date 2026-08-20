import { describe, expect, it } from 'vitest';
import { upstreamErrorResponse } from './upstream-error';

describe('upstream error responses', () => {
  it('turns timeout DOM exceptions into a safe 504 response', async () => {
    const response = upstreamErrorResponse(new DOMException('timed out', 'TimeoutError'));
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining('longer than expected'),
    });
  });

  it('turns connection errors into a safe 502 response', async () => {
    const response = upstreamErrorResponse(new TypeError('connect failed'));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining('unable to reach'),
    });
  });
});
