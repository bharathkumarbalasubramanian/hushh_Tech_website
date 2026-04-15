/**
 * Coins Credit Notification Service Tests
 * 
 * Tests for the coins-credit-notification Supabase Edge Function
 * Run with: SUPABASE_SERVICE_ROLE_KEY=<key> npm test -- tests/coinsCreditNotification.test.ts
 * 
 * NOTE: Integration tests require a valid Supabase service_role key.
 * Set SUPABASE_SERVICE_ROLE_KEY env var to run, otherwise tests are skipped in CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const SUPABASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/coins-credit-notification`;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const hasValidKey = !!SERVICE_KEY;
const describeIntegration = hasValidKey ? describe : describe.skip;

// Test payload helper
const createTestPayload = (overrides = {}) => ({
  recipientEmail: 'test-vitest@example.com',
  recipientName: 'Test User',
  coinsAwarded: 300000,
  ...overrides,
});

describeIntegration('Coins Credit Notification Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject requests missing recipientEmail', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ coinsAwarded: 300000 }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing recipientEmail or coinsAwarded');
    });

    it('should reject requests missing coinsAwarded', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ recipientEmail: 'test@example.com' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing recipientEmail or coinsAwarded');
    });

    it('should reject requests with empty body', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('CORS Support', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://hushh.ai',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  describe('Email Sending', () => {
    it('should process valid payload without validation error (200 or 500 if SMTP unavailable)', async () => {
      const payload = createTestPayload({
        recipientName: `Test User - ${Date.now()}`,
        recipientEmail: 'test-vitest-coins@example.com',
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Valid payload should NOT return 400 (validation error)
      expect(response.status).not.toBe(400);

      if (response.status === 200) {
        // SMTP configured — email sent successfully
        expect(data.success).toBe(true);
        expect(data.message).toBe('Coins credit email sent');
      } else {
        // SMTP not configured — 500 with error message (expected in test env)
        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error');
      }
    });

    it('should accept default recipientName when not provided', async () => {
      const payload = {
        recipientEmail: 'test-vitest-default@example.com',
        coinsAwarded: 300000,
      };

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      // Should NOT be a validation error — optional field
      expect(response.status).not.toBe(400);
    });
  });

  describe('Response Format', () => {
    it('should return valid JSON response structure', async () => {
      const payload = createTestPayload();

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Valid payload → either success (200) or SMTP error (500), never 400
      expect(response.status).not.toBe(400);

      if (response.status === 200) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('message');
        expect(data.success).toBe(true);
      } else {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });

    it('should return error structure on validation failure', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });
  });
});

// Smoke test — always runs (no auth needed for OPTIONS)
describe('Coins Credit Notification Smoke Test', () => {
  it('function is deployed and reachable', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
    });

    expect(response.ok).toBe(true);
  });
});
