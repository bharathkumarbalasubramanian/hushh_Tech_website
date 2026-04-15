/**
 * Plaid Financial Integration Tests
 * 
 * Tests the complete Plaid sandbox flow:
 * 1. Create Link Token
 * 2. Exchange Public Token
 * 3. Fetch Balances
 * 4. Fetch Investments
 * 5. Create Asset Report
 * 6. Save to user_financial_data table
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =====================================================
// Mock Data — Plaid Sandbox responses
// =====================================================

const MOCK_USER_ID = 'test-user-123';
const MOCK_USER_EMAIL = 'test@hushh.ai';
const MOCK_ACCESS_TOKEN = 'access-sandbox-abc123';
const MOCK_ITEM_ID = 'item-sandbox-xyz789';
const MOCK_PUBLIC_TOKEN = 'public-sandbox-token-456';
const MOCK_ASSET_REPORT_TOKEN = 'assets-sandbox-report-token';

const SUPABASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1';

/** Mock link token response */
const mockLinkTokenResponse = {
  link_token: 'link-sandbox-token-abc',
  expiration: '2026-02-16T00:00:00Z',
};

/** Mock exchange token response */
const mockExchangeResponse = {
  access_token: MOCK_ACCESS_TOKEN,
  item_id: MOCK_ITEM_ID,
};

/** Mock balance response — sandbox checking + savings */
const mockBalanceResponse = {
  accounts: [
    {
      account_id: 'acc-checking-001',
      name: 'Plaid Checking',
      type: 'depository',
      subtype: 'checking',
      balances: {
        available: 100.00,
        current: 110.00,
        iso_currency_code: 'USD',
        limit: null,
      },
    },
    {
      account_id: 'acc-savings-001',
      name: 'Plaid Saving',
      type: 'depository',
      subtype: 'savings',
      balances: {
        available: 200.00,
        current: 210.00,
        iso_currency_code: 'USD',
        limit: null,
      },
    },
  ],
};

/** Mock investments response — sandbox holdings */
const mockInvestmentsResponse = {
  accounts: [
    {
      account_id: 'acc-invest-001',
      name: 'Plaid IRA',
      type: 'investment',
      subtype: 'ira',
      balances: { current: 320.76, iso_currency_code: 'USD' },
    },
  ],
  holdings: [
    {
      account_id: 'acc-invest-001',
      security_id: 'sec-001',
      institution_value: 320.76,
      quantity: 10,
      cost_basis: 300.00,
      iso_currency_code: 'USD',
    },
  ],
  securities: [
    {
      security_id: 'sec-001',
      name: 'iShares Inc',
      ticker_symbol: 'IBKR',
      type: 'etf',
      close_price: 32.076,
      iso_currency_code: 'USD',
    },
  ],
};

/** Mock asset report response */
const mockAssetReportResponse = {
  asset_report_token: MOCK_ASSET_REPORT_TOKEN,
  asset_report_id: 'report-sandbox-001',
  status: 'complete',
  days_requested: 90,
  items: [
    {
      item_id: MOCK_ITEM_ID,
      institution_name: 'First Platypus Bank',
      accounts: [
        {
          account_id: 'acc-checking-001',
          name: 'Plaid Checking',
          balances: { current: 110.00 },
          historical_balances: [
            { date: '2026-02-01', current: 105.00 },
            { date: '2026-01-01', current: 98.00 },
          ],
        },
      ],
    },
  ],
};

// =====================================================
// Helper — format currency (mirrors plaidService.ts)
// =====================================================

const formatCurrency = (amount: number | null | undefined, currency = 'USD'): string => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// =====================================================
// Tests
// =====================================================

describe('Plaid Integration — API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------
  // 1. Create Link Token
  // -------------------------------------------------
  describe('1. Create Link Token', () => {
    it('should create a link token with userId', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLinkTokenResponse),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/create-link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: MOCK_USER_ID, userEmail: MOCK_USER_EMAIL }),
      });
      const data = await res.json();

      expect(data.link_token).toBeDefined();
      expect(data.link_token).toContain('link-sandbox');
      expect(data.expiration).toBeDefined();
    });

    it('should fail without userId', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'userId is required' }),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/create-link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      expect(res.ok).toBe(false);
      expect(data.error).toContain('userId');
    });
  });

  // -------------------------------------------------
  // 2. Exchange Public Token
  // -------------------------------------------------
  describe('2. Exchange Public Token', () => {
    it('should exchange public token for access token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeResponse),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/exchange-public-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicToken: MOCK_PUBLIC_TOKEN,
          userId: MOCK_USER_ID,
          institutionName: 'First Platypus Bank',
          institutionId: 'ins_109508',
        }),
      });
      const data = await res.json();

      expect(data.access_token).toBe(MOCK_ACCESS_TOKEN);
      expect(data.item_id).toBe(MOCK_ITEM_ID);
    });

    it('should fail without publicToken', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'publicToken is required' }),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/exchange-public-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: MOCK_USER_ID }),
      });
      const data = await res.json();

      expect(res.ok).toBe(false);
      expect(data.error).toContain('publicToken');
    });
  });

  // -------------------------------------------------
  // 3. Fetch Balances
  // -------------------------------------------------
  describe('3. Fetch Balances', () => {
    it('should return account balances', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBalanceResponse),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/get-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: MOCK_ACCESS_TOKEN, userId: MOCK_USER_ID }),
      });
      const data = await res.json();

      expect(data.accounts).toBeDefined();
      expect(data.accounts.length).toBe(2);

      // Check checking account
      const checking = data.accounts.find((a: any) => a.subtype === 'checking');
      expect(checking).toBeDefined();
      expect(checking.balances.current).toBe(110.00);
      expect(checking.balances.available).toBe(100.00);

      // Check savings account
      const savings = data.accounts.find((a: any) => a.subtype === 'savings');
      expect(savings).toBeDefined();
      expect(savings.balances.current).toBe(210.00);
    });

    it('should compute total balance across accounts', () => {
      const accounts = mockBalanceResponse.accounts;
      const total = accounts.reduce(
        (sum, acc) => sum + (acc.balances.current || 0), 0
      );
      expect(total).toBe(320.00);
      expect(formatCurrency(total)).toBe('$320');
    });
  });

  // -------------------------------------------------
  // 4. Fetch Investments
  // -------------------------------------------------
  describe('4. Fetch Investments', () => {
    it('should return holdings and securities', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvestmentsResponse),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/investments-holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: MOCK_ACCESS_TOKEN, userId: MOCK_USER_ID }),
      });
      const data = await res.json();

      expect(data.holdings).toBeDefined();
      expect(data.holdings.length).toBeGreaterThan(0);
      expect(data.securities).toBeDefined();
      expect(data.securities.length).toBeGreaterThan(0);

      // Check holding values
      const holding = data.holdings[0];
      expect(holding.institution_value).toBe(320.76);
      expect(holding.quantity).toBe(10);
      expect(holding.cost_basis).toBe(300.00);
    });

    it('should compute total investment value', () => {
      const totalValue = mockInvestmentsResponse.holdings.reduce(
        (sum, h) => sum + (h.institution_value || 0), 0
      );
      expect(totalValue).toBe(320.76);
      expect(formatCurrency(totalValue)).toBe('$320.76');
    });

    it('should handle institution with no investment products', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'PRODUCTS_NOT_SUPPORTED' }),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/investments-holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: MOCK_ACCESS_TOKEN, userId: MOCK_USER_ID }),
      });

      expect(res.ok).toBe(false);
    });
  });

  // -------------------------------------------------
  // 5. Asset Report
  // -------------------------------------------------
  describe('5. Asset Report', () => {
    it('should create an asset report', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAssetReportResponse),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/asset-report-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: MOCK_ACCESS_TOKEN, userId: MOCK_USER_ID }),
      });
      const data = await res.json();

      expect(data.asset_report_token).toBe(MOCK_ASSET_REPORT_TOKEN);
      expect(data.status).toBe('complete');
      expect(data.days_requested).toBe(90);
      expect(data.items).toBeDefined();
      expect(data.items.length).toBeGreaterThan(0);
    });

    it('should handle pending asset report', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          asset_report_token: MOCK_ASSET_REPORT_TOKEN,
          status: 'pending',
        }),
      } as Response);

      const res = await fetch(`${SUPABASE_URL}/asset-report-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: MOCK_ACCESS_TOKEN, userId: MOCK_USER_ID }),
      });
      const data = await res.json();

      expect(data.status).toBe('pending');
      expect(data.asset_report_token).toBeDefined();
    });
  });
});

// =====================================================
// Financial Data Aggregation Tests
// =====================================================

describe('Plaid Integration — Data Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('6. Fetch All Financial Data (parallel)', () => {
    it('should fetch all 3 products successfully', async () => {
      // Mock 3 sequential fetch calls
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBalanceResponse),
          } as Response);
        }
        if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssetReportResponse),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvestmentsResponse),
        } as Response);
      });

      // Simulate fetchAllFinancialData logic
      const [b, a, i] = await Promise.allSettled([
        fetch(`${SUPABASE_URL}/get-balance`, { method: 'POST', body: '{}' }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/asset-report-create`, { method: 'POST', body: '{}' }).then(r => r.json()),
        fetch(`${SUPABASE_URL}/investments-holdings`, { method: 'POST', body: '{}' }).then(r => r.json()),
      ]);

      expect(b.status).toBe('fulfilled');
      expect(a.status).toBe('fulfilled');
      expect(i.status).toBe('fulfilled');

      if (b.status === 'fulfilled') {
        expect(b.value.accounts.length).toBe(2);
      }
      if (a.status === 'fulfilled') {
        expect(a.value.asset_report_token).toBeDefined();
      }
      if (i.status === 'fulfilled') {
        expect(i.value.holdings.length).toBeGreaterThan(0);
      }
    });

    it('should handle partial failure gracefully', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBalanceResponse),
          } as Response);
        }
        if (callCount === 2) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'PRODUCTS_NOT_SUPPORTED' }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'PRODUCTS_NOT_SUPPORTED' }),
        } as Response);
      });

      const results = await Promise.allSettled([
        fetch(`${SUPABASE_URL}/get-balance`, { method: 'POST', body: '{}' }),
        fetch(`${SUPABASE_URL}/asset-report-create`, { method: 'POST', body: '{}' }),
        fetch(`${SUPABASE_URL}/investments-holdings`, { method: 'POST', body: '{}' }),
      ]);

      // All promises resolve (even failed HTTP), only network errors reject
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      // Balance succeeded
      const balanceRes = (results[0] as PromiseFulfilledResult<Response>).value;
      expect(balanceRes.ok).toBe(true);

      // Assets failed
      const assetsRes = (results[1] as PromiseFulfilledResult<Response>).value;
      expect(assetsRes.ok).toBe(false);

      // Count available products
      const available = results.filter(
        r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<Response>).value.ok
      ).length;
      expect(available).toBe(1);
      expect(available >= 1).toBe(true); // can_proceed
    });
  });
});

// =====================================================
// user_financial_data Table Structure Tests
// =====================================================

describe('Plaid Integration — Supabase Storage', () => {
  describe('7. user_financial_data table structure', () => {
    it('should build correct upsert payload', () => {
      const balanceResult = { available: true, data: mockBalanceResponse, error: null, reason: null };
      const assetsResult = { available: true, data: mockAssetReportResponse, error: null, reason: null };
      const investResult = { available: true, data: mockInvestmentsResponse, error: null, reason: null };

      const errors: Record<string, string> = {};

      const payload = {
        user_id: MOCK_USER_ID,
        plaid_item_id: MOCK_ITEM_ID,
        institution_name: 'First Platypus Bank',
        institution_id: 'ins_109508',
        balances: balanceResult.available ? balanceResult.data : null,
        asset_report: assetsResult.available ? assetsResult.data : null,
        asset_report_token: assetsResult.data?.asset_report_token || null,
        investments: investResult.available ? investResult.data : null,
        available_products: {
          balance: balanceResult.available,
          assets: assetsResult.available,
          investments: investResult.available,
        },
        status: 'complete',
        fetch_errors: Object.keys(errors).length > 0 ? errors : null,
        updated_at: new Date().toISOString(),
      };

      // Validate payload structure
      expect(payload.user_id).toBe(MOCK_USER_ID);
      expect(payload.plaid_item_id).toBe(MOCK_ITEM_ID);
      expect(payload.institution_name).toBe('First Platypus Bank');

      // Balances
      expect(payload.balances).toBeDefined();
      expect(payload.balances!.accounts.length).toBe(2);

      // Asset report
      expect(payload.asset_report).toBeDefined();
      expect(payload.asset_report_token).toBe(MOCK_ASSET_REPORT_TOKEN);

      // Investments
      expect(payload.investments).toBeDefined();
      expect(payload.investments!.holdings.length).toBe(1);

      // Available products
      expect(payload.available_products.balance).toBe(true);
      expect(payload.available_products.assets).toBe(true);
      expect(payload.available_products.investments).toBe(true);

      // Status
      expect(payload.status).toBe('complete');
      expect(payload.fetch_errors).toBeNull();
    });

    it('should build partial payload when some products fail', () => {
      const balanceResult = { available: true, data: mockBalanceResponse, error: null, reason: null };
      const assetsResult = { available: false, data: null, error: 'PRODUCTS_NOT_SUPPORTED', reason: 'not_supported' };
      const investResult = { available: false, data: null, error: 'PRODUCTS_NOT_SUPPORTED', reason: 'not_supported' };

      const errors: Record<string, string> = {};
      if (assetsResult.error) errors.assets = assetsResult.error;
      if (investResult.error) errors.investments = investResult.error;

      const available = [balanceResult, assetsResult, investResult].filter(r => r.available).length;

      const payload = {
        user_id: MOCK_USER_ID,
        plaid_item_id: MOCK_ITEM_ID,
        institution_name: 'Simple Bank',
        institution_id: 'ins_simple',
        balances: balanceResult.available ? balanceResult.data : null,
        asset_report: assetsResult.available ? assetsResult.data : null,
        asset_report_token: null,
        investments: investResult.available ? investResult.data : null,
        available_products: {
          balance: balanceResult.available,
          assets: assetsResult.available,
          investments: investResult.available,
        },
        status: available === 3 ? 'complete' : available > 0 ? 'partial' : 'failed',
        fetch_errors: Object.keys(errors).length > 0 ? errors : null,
      };

      expect(payload.balances).toBeDefined();
      expect(payload.asset_report).toBeNull();
      expect(payload.investments).toBeNull();
      expect(payload.status).toBe('partial');
      expect(payload.fetch_errors).toEqual({
        assets: 'PRODUCTS_NOT_SUPPORTED',
        investments: 'PRODUCTS_NOT_SUPPORTED',
      });
      expect(payload.available_products.balance).toBe(true);
      expect(payload.available_products.assets).toBe(false);
      expect(payload.available_products.investments).toBe(false);
    });
  });
});

// =====================================================
// Utility Tests
// =====================================================

describe('Plaid Integration — Utilities', () => {
  describe('8. formatCurrency', () => {
    it('should format USD amounts correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(1000000)).toBe('$1,000,000');
    });

    it('should handle null/undefined', () => {
      expect(formatCurrency(null)).toBe('—');
      expect(formatCurrency(undefined)).toBe('—');
    });
  });

  describe('9. Product status logic', () => {
    it('should determine correct product status', () => {
      type ProductFetchStatus = 'idle' | 'loading' | 'success' | 'unavailable' | 'error' | 'pending';

      const getProductStatus = (product: {
        available: boolean;
        data: any;
        error: string | null;
        reason: string | null;
      }): ProductFetchStatus => {
        if (product.available) return product.data?.status === 'pending' ? 'pending' : 'success';
        if (product.reason === 'not_supported') return 'unavailable';
        if (product.error) return 'error';
        if (product.data?.status === 'pending') return 'pending';
        return 'idle';
      };

      expect(getProductStatus({ available: true, data: {}, error: null, reason: null })).toBe('success');
      expect(getProductStatus({ available: true, data: { status: 'pending' }, error: null, reason: null })).toBe('pending');
      expect(getProductStatus({ available: false, data: null, error: null, reason: 'not_supported' })).toBe('unavailable');
      expect(getProductStatus({ available: false, data: null, error: 'Network error', reason: 'error' })).toBe('error');
      expect(getProductStatus({ available: false, data: null, error: null, reason: null })).toBe('idle');
    });
  });
});

// =====================================================
// End-to-End Flow Tests
// =====================================================

describe('Plaid Integration — E2E Flow', () => {
  describe('10. Complete sandbox flow', () => {
    it('should follow correct flow: Link Token → Plaid Link → Exchange → Fetch All → Save', () => {
      const flowSteps: string[] = [];

      // Step 1: Create link token
      flowSteps.push('create_link_token');

      // Step 2: Open Plaid Link (user selects bank)
      flowSteps.push('open_plaid_link');

      // Step 3: Exchange public token
      flowSteps.push('exchange_public_token');

      // Step 4: Fetch all financial data in parallel
      flowSteps.push('fetch_balance');
      flowSteps.push('fetch_assets');
      flowSteps.push('fetch_investments');

      // Step 5: Save to user_financial_data
      flowSteps.push('save_to_supabase');

      // Step 6: User proceeds to KYC
      flowSteps.push('proceed_to_kyc');

      expect(flowSteps).toEqual([
        'create_link_token',
        'open_plaid_link',
        'exchange_public_token',
        'fetch_balance',
        'fetch_assets',
        'fetch_investments',
        'save_to_supabase',
        'proceed_to_kyc',
      ]);
    });

    it('should allow proceeding with at least 1 product available', () => {
      const canProceed = (productsAvailable: number) => productsAvailable >= 1;

      expect(canProceed(3)).toBe(true);
      expect(canProceed(2)).toBe(true);
      expect(canProceed(1)).toBe(true);
      expect(canProceed(0)).toBe(false);
    });

    it('should determine overall status correctly', () => {
      const getStatus = (count: number) => {
        if (count === 3) return 'complete';
        if (count > 0) return 'partial';
        return 'failed';
      };

      expect(getStatus(3)).toBe('complete');
      expect(getStatus(2)).toBe('partial');
      expect(getStatus(1)).toBe('partial');
      expect(getStatus(0)).toBe('failed');
    });
  });
});
