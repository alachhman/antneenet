import { assertEquals } from 'jsr:@std/assert';
import { rateLimitOk } from './index.ts';

Deno.test('rateLimitOk allows first 5 attempts, rejects 6th within window', () => {
  const now = Date.now();
  const attempts = Array.from({ length: 5 }, (_, i) => now - i * 1000);
  assertEquals(rateLimitOk(attempts, now, 5, 10 * 60 * 1000), false);

  const attempts4 = attempts.slice(1); // 4 attempts
  assertEquals(rateLimitOk(attempts4, now, 5, 10 * 60 * 1000), true);
});

Deno.test('rateLimitOk ignores attempts outside the window', () => {
  const now = Date.now();
  const old = now - 20 * 60 * 1000;
  const attempts = Array.from({ length: 10 }, () => old);
  assertEquals(rateLimitOk(attempts, now, 5, 10 * 60 * 1000), true);
});
