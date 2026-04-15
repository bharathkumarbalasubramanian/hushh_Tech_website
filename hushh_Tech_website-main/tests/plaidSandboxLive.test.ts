/**
 * Plaid Sandbox LIVE Integration Tests
 * 
 * These tests call the REAL Plaid Sandbox API (no mocks).
 * They verify the complete flow:
 *   1. /sandbox/public_token/create → public_token
 *   2. /item/public_token/exchange → access_token
 *   3. /accounts/balance/get → balances
 *   4. /investments/holdings/get → holdings + securities
 *   5. /asset_report/create → asset report token
 * 
 * Requires PLAID_CLIENT_ID and PLAID_SECRET env vars.
 * Run with: npx vitest run tests/plaidSandboxLive.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

// =====================================================
// Config
// =====================================================

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = process.env.PLAID_SECRET || '';
const BASE_URL = 'https://sandbox.plaid.com';
const INSTITUTION_ID = 'ins_109508'; // First Platypus Bank

// Skip entire suite if no credentials (e.g., in CI)
const HAS_CREDENTIALS = PLAID_CLIENT_ID.length > 0 && PLAID_SECRET.length > 0;

// Shared state across tests
let publicToken: string;
let accessToken: string;
let itemId: string;

// =====================================================
// Tests — skipped automatically in CI (no credentials)
// =====================================================

describe.skipIf(!HAS_CREDENTIALS)('Plaid Sandbox — LIVE API Tests', () => {
  // Increase timeout for real API calls
  const TIMEOUT = 30_000;

  // -------------------------------------------------
  // Step 1: Create Sandbox Public Token
  // -------------------------------------------------
  describe('1. /sandbox/public_token/create', () => {
    it('should create a public token for First Platypus Bank', async () => {
      const res = await fetch(`${BASE_URL}/sandbox/public_token/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          institution_id: INSTITUTION_ID,
          initial_products: ['assets', 'auth', 'transactions', 'investments'],
          options: {
            override_username: 'user_good',
            override_password: 'pass_good',
          },
        }),
      });

      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.public_token).toBeDefined();
      expect(data.public_token).toContain('public-sandbox');
      expect(data.request_id).toBeDefined();

      // Store for next tests
      publicToken = data.public_token;
      console.log('✅ Public token:', publicToken.substring(0, 30) + '...');
    }, TIMEOUT);
  });

  // -------------------------------------------------
  // Step 2: Exchange Public Token
  // -------------------------------------------------
  describe('2. /item/public_token/exchange', () => {
    it('should exchange public token for access token', async () => {
      expect(publicToken).toBeDefined();

      const res = await fetch(`${BASE_URL}/item/public_token/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          public_token: publicToken,
        }),
      });

      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.access_token).toBeDefined();
      expect(data.access_token).toContain('access-sandbox');
      expect(data.item_id).toBeDefined();

      // Store for next tests
      accessToken = data.access_token;
      itemId = data.item_id;
      console.log('✅ Access token:', accessToken.substring(0, 30) + '...');
      console.log('✅ Item ID:', itemId);
    }, TIMEOUT);
  });

  // -------------------------------------------------
  // Step 3: Fetch Balances
  // -------------------------------------------------
  describe('3. /accounts/balance/get', () => {
    it('should return sandbox account balances', async () => {
      expect(accessToken).toBeDefined();

      const res = await fetch(`${BASE_URL}/accounts/balance/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: accessToken,
        }),
      });

      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.accounts).toBeDefined();
      expect(data.accounts.length).toBeGreaterThan(0);

      // Sandbox should have checking + savings
      const accountTypes = data.accounts.map((a: any) => a.subtype);
      console.log('✅ Balance accounts:', data.accounts.length, '| Types:', accountTypes.join(', '));

      // Each account should have balances
      for (const account of data.accounts) {
        expect(account.balances).toBeDefined();
        expect(account.balances.iso_currency_code).toBe('USD');
        expect(typeof account.balances.current).toBe('number');
      }

      // Compute total
      const total = data.accounts.reduce(
        (sum: number, a: any) => sum + (a.balances.current || 0), 0
      );
      console.log('✅ Total balance: $' + total.toFixed(2));
      expect(total).toBeGreaterThan(0);
    }, TIMEOUT);
  });

  // -------------------------------------------------
  // Step 4: Fetch Investments
  // -------------------------------------------------
  describe('4. /investments/holdings/get', () => {
    it('should return sandbox investment holdings', async () => {
      expect(accessToken).toBeDefined();

      const res = await fetch(`${BASE_URL}/investments/holdings/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: accessToken,
        }),
      });

      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.holdings).toBeDefined();
      expect(data.securities).toBeDefined();
      expect(data.accounts).toBeDefined();

      console.log('✅ Holdings:', data.holdings.length, '| Securities:', data.securities.length);

      // Check holdings have required fields
      if (data.holdings.length > 0) {
        const holding = data.holdings[0];
        expect(holding.account_id).toBeDefined();
        expect(holding.security_id).toBeDefined();
        expect(typeof holding.institution_value).toBe('number');
        expect(typeof holding.quantity).toBe('number');
      }

      // Compute total investment value
      const totalValue = data.holdings.reduce(
        (sum: number, h: any) => sum + (h.institution_value || 0), 0
      );
      console.log('✅ Total investment value: $' + totalValue.toFixed(2));
    }, TIMEOUT);
  });

  // -------------------------------------------------
  // Step 5: Create Asset Report
  // -------------------------------------------------
  describe('5. /asset_report/create', () => {
    it('should create an asset report', async () => {
      expect(accessToken).toBeDefined();

      const res = await fetch(`${BASE_URL}/asset_report/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_tokens: [accessToken],
          days_requested: 90,
        }),
      });

      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.asset_report_token).toBeDefined();
      expect(data.asset_report_id).toBeDefined();

      console.log('✅ Asset report token:', data.asset_report_token.substring(0, 30) + '...');
      console.log('✅ Asset report ID:', data.asset_report_id);
    }, TIMEOUT);
  });

  // -------------------------------------------------
  // Step 6: Verify user_financial_data payload
  // -------------------------------------------------
  describe('6. user_financial_data payload construction', () => {
    it('should build a valid payload for Supabase upsert', async () => {
      // Fetch all data for the payload
      const [balRes, invRes] = await Promise.all([
        fetch(`${BASE_URL}/accounts/balance/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
          }),
        }).then(r => r.json()),
        fetch(`${BASE_URL}/investments/holdings/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: accessToken,
          }),
        }).then(r => r.json()),
      ]);

      // Build the Supabase payload
      const payload = {
        user_id: 'test-user-sandbox-123',
        plaid_item_id: itemId,
        institution_name: 'First Platypus Bank',
        institution_id: INSTITUTION_ID,
        balances: balRes,
        investments: invRes,
        asset_report: null, // Asset reports are async
        asset_report_token: null,
        available_products: {
          balance: !balRes.error_code,
          assets: false,
          investments: !invRes.error_code,
        },
        status: 'partial',
        fetch_errors: null,
        updated_at: new Date().toISOString(),
      };

      // Validate all fields exist
      expect(payload.user_id).toBeDefined();
      expect(payload.plaid_item_id).toBe(itemId);
      expect(payload.institution_name).toBe('First Platypus Bank');
      expect(payload.balances.accounts.length).toBeGreaterThan(0);
      expect(payload.investments.holdings.length).toBeGreaterThan(0);
      expect(payload.available_products.balance).toBe(true);
      expect(payload.available_products.investments).toBe(true);

      console.log('✅ Payload valid — ready for Supabase upsert');
      console.log('   Accounts:', payload.balances.accounts.length);
      console.log('   Holdings:', payload.investments.holdings.length);
      console.log('   Status:', payload.status);
    }, TIMEOUT);
  });
});
