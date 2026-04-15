/**
 * NWS Score Notification Service Tests
 * 
 * Tests for the nws-score-notification Supabase Edge Function
 * Run with: SUPABASE_SERVICE_ROLE_KEY=<key> npm test -- tests/nwsScoreNotification.test.ts
 * 
 * NOTE: Integration tests require a valid Supabase service_role key.
 * Set SUPABASE_SERVICE_ROLE_KEY env var to run, otherwise tests are skipped in CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const SUPABASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nws-score-notification`;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const hasValidKey = !!SERVICE_KEY;
const describeIntegration = hasValidKey ? describe : describe.skip;

// Test payload helper — matches NWSNotificationPayload interface
const createTestPayload = (overrides = {}) => ({
  user_email: 'test-vitest-nws@example.com',
  user_name: 'Test User',
  nws_score: 72,
  nws_tier: 'Strong',
  total_cash_balance: 45000,
  total_investment_value: 120000,
  num_accounts: 4,
  account_types: ['checking', 'savings', 'brokerage', '401k'],
  primary_institution: 'Chase Bank',
  address_city: 'San Francisco',
  address_state: 'CA',
  identity_verification_score: 95,
  profile_url: 'https://hushh.ai/hushh-user-profile',
  ...overrides,
});

describeIntegration('NWS Score Notification Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject requests missing user_email', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ user_name: 'Test', nws_score: 72, nws_tier: 'Strong' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing user_email or user_name');
    });

    it('should reject requests missing user_name', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ user_email: 'test@example.com', nws_score: 72, nws_tier: 'Strong' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing user_email or user_name');
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

      // NWS function returns 204 for OPTIONS
      expect([200, 204]).toContain(response.status);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  describe('Email Sending', () => {
    it('should process full payload without validation error (200 or 500 if Resend API unavailable)', async () => {
      const payload = createTestPayload({
        user_name: `Test User - ${Date.now()}`,
        user_email: 'test-vitest-nws-full@example.com',
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

      // Valid payload → NOT a validation error
      expect(response.status).not.toBe(400);

      if (response.status === 200) {
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('email_id');
      } else {
        // Resend API key not configured → 500
        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error');
      }
    });

    it('should process Elite tier payload without validation error', async () => {
      const payload = createTestPayload({
        user_email: 'test-vitest-nws-elite@example.com',
        nws_score: 92,
        nws_tier: 'Elite',
        total_cash_balance: 500000,
        total_investment_value: 2000000,
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
      expect(response.status).not.toBe(400);
    });

    it('should process Building tier payload without validation error', async () => {
      const payload = createTestPayload({
        user_email: 'test-vitest-nws-building@example.com',
        nws_score: 25,
        nws_tier: 'Building',
        total_cash_balance: 5000,
        total_investment_value: 0,
        num_accounts: 1,
        account_types: ['checking'],
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
      expect(response.status).not.toBe(400);
    });

    it('should handle minimal required fields without validation error', async () => {
      const payload = {
        user_email: 'test-vitest-nws-minimal@example.com',
        user_name: 'Minimal User',
        nws_score: 50,
        nws_tier: 'Moderate',
        total_cash_balance: 10000,
        total_investment_value: 0,
        num_accounts: 1,
        account_types: [],
        primary_institution: null,
        address_city: null,
        address_state: null,
        identity_verification_score: null,
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

      expect(response.status).not.toBe(400);

      if (response.status === 200) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('email_id');
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
describe('NWS Score Notification Smoke Test', () => {
  it('function is deployed and reachable', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
    });

    // NWS returns 204 for OPTIONS
    expect([200, 204]).toContain(response.status);
  });
});
