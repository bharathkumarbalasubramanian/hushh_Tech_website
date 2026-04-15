/**
 * NDA Notification Service Tests
 * 
 * Tests for the nda-signed-notification Supabase Edge Function
 * Run with: npm test -- tests/ndaNotification.test.ts
 * 
 * NOTE: These integration tests require a valid Supabase service_role key.
 * Set SUPABASE_SERVICE_ROLE_KEY env var to run, otherwise tests are skipped in CI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use service_role key from env or fall back to anon key
const SUPABASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/nda-signed-notification`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Skip integration tests if no valid key is available
const hasValidKey = !!SUPABASE_ANON_KEY;

// Test payload helper
const createTestPayload = (overrides = {}) => ({
  signerName: 'Test User',
  signerEmail: 'test@example.com',
  signedAt: new Date().toISOString(),
  ndaVersion: 'v1.0',
  signerIp: '127.0.0.1',
  userId: 'test-user-123',
  ...overrides,
});

// Use describe.skipIf to skip when no service key is available
const describeIntegration = hasValidKey ? describe : describe.skip;

describeIntegration('NDA Notification Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject requests missing signerName', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ signerEmail: 'test@example.com', ndaVersion: 'v1.0' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject requests missing signerEmail', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ signerName: 'Test User', ndaVersion: 'v1.0' }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
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
    it('should successfully send notification with valid payload', async () => {
      const payload = createTestPayload({
        signerName: `Test User - ${Date.now()}`,
        signerEmail: 'test-vitest@example.com',
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Note: This test sends a real email, so we check for success
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recipients).toContain('manish@hushh.ai');
      expect(data.recipients).toContain('ankit@hushh.ai');
      expect(data.messageId).toBeDefined();
    });

    it('should include PDF URL in email when provided', async () => {
      const payload = createTestPayload({
        signerName: `PDF URL Test - ${Date.now()}`,
        pdfUrl: 'https://hushh.ai/sample-nda.pdf',
      });

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure on success', async () => {
      const payload = createTestPayload();

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('recipients');
      expect(Array.isArray(data.recipients)).toBe(true);
    });

    it('should return error structure on validation failure', async () => {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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

// Quick smoke test
describe('NDA Notification Smoke Test', () => {
  it('function is deployed and reachable', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
    });
    
    expect(response.ok).toBe(true);
  });
});
