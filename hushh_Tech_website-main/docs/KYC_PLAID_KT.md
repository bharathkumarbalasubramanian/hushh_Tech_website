# 🎓 KYC + Plaid Financial Verification — Knowledge Transfer

> Last updated: Feb 15, 2026 | PRs #326-329 merged

---

## 1. High-Level User Journey

```
User lands on hushh.ai
        ↓
Clicks "Complete Your Hushh Profile" (Hero.tsx or profilePage.tsx)
        ↓
Auth Check (ProtectedRoute.tsx → Supabase session check)
        ↓
/onboarding/financial-link ← MANDATORY Plaid Step
│  → Checks if user_financial_data exists → auto-skips if yes
│  → Renders KycFinancialLinkScreen
│  → User links bank via Plaid Link SDK
│  → On success: balance, assets, investments fetched in parallel
│  → Data saved to Supabase → user_financial_data table
│  → "Continue to KYC →" button appears (only after completion)
        ↓
/onboarding/step-1 ← KYC Step 1: Account Tier Selection ($1M/$5M/$25M)
        ↓
/onboarding/step-2 → step-15 ← 15 steps of profile data collection
│  → Personal info, investment preferences, risk tolerance, etc.
│  → Each step saves to Supabase → onboarding_data table
        ↓
/onboarding/verify → verify-complete → meet-ceo
│  → Identity verification + welcome
        ↓
/hushh-user-profile ← Completed Profile View
```

---

## 2. Authentication Flow

### Files:
| File | Purpose |
|------|---------|
| `src/components/ProtectedRoute.tsx` | Auth guard — checks Supabase session, redirects to login if none |
| `src/pages/AuthCallback.tsx` | Handles OAuth/email verification callbacks |

### How it works:
1. **ProtectedRoute** wraps all `/onboarding/*` routes
2. Checks `supabase.auth.getSession()` → if no session → redirect to login
3. On login success → **AuthCallback** runs:
   - Exchanges OAuth code for session
   - Runs `enrichUserProfile()` (AI-based profile enrichment from email)
   - Pre-fills onboarding fields if AI confidence ≥ 0.4
   - Redirects to `/onboarding/step-1` (or `/hushh-user-profile` if already done)

---

## 3. Plaid Financial Verification (Pre-KYC)

### Files:
| File | Purpose |
|------|---------|
| `src/pages/onboarding/FinancialLink.tsx` | Page wrapper — checks existing data, renders screen |
| `src/components/kyc/screens/KycFinancialLinkScreen.tsx` | UI component — product cards, CTA button |
| `src/services/plaid/usePlaidLink.ts` | React hook — manages Plaid Link lifecycle + OAuth |
| `src/services/plaid/plaidService.ts` | API service — calls Supabase edge functions |

### How Plaid Link works:

```
1. usePlaidLinkHook auto-initializes on mount:
   → createLinkToken(userId, email, redirectUri)
   → Edge function calls Plaid API /link/token/create
   → Returns link_token

2. User clicks "Link Bank Account":
   → Plaid Link SDK opens (iframe)
   → User selects bank → enters credentials
   → Plaid returns publicToken + metadata

3. On success (handleSuccess):
   → exchangeToken(publicToken, userId) → access_token + item_id
   → fetchAllFinancialData(accessToken, userId) in parallel:
     ├── fetchBalance → /get-balance edge function
     ├── fetchAssets → /asset-report-create edge function
     └── fetchInvestments → /investments-holdings edge function
   → saveFinancialDataToSupabase(userId, result) → user_financial_data table

4. "Continue to KYC →" button appears (only when step=done + canProceed)
```

### OAuth Banks (Chase, Wells Fargo, BofA):
```
Normal bank: Plaid Link SDK handles everything in iframe
OAuth bank:  User redirected to bank website → logs in → redirected back

OAuth flow:
1. Initial: link_token created with redirect_uri = current page URL
2. User selects Chase → redirected to chase.com
3. Chase redirects back: /onboarding/financial-link?oauth_state_id=xxx
4. usePlaidLink detects oauth_state_id in URL
5. Creates NEW link_token with receivedRedirectUri = full URL
6. Auto-opens Plaid Link → resumes session → SUCCESS
7. Cleans oauth_state_id from URL
```

---

## 4. Supabase Edge Functions

| Edge Function | Endpoint | Purpose |
|--------------|----------|---------|
| `create-link-token` | POST | Creates Plaid Link token (supports OAuth redirect_uri) |
| `exchange-public-token` | POST | Exchanges public_token → access_token, saves to DB |
| `get-balance` | POST | Fetches account balances via Plaid API |
| `asset-report-create` | POST | Creates/gets asset report (may be async) |
| `investments-holdings` | POST | Fetches investment holdings + securities |
| `sandbox-create-test-item` | POST | **Sandbox only** — bypasses Plaid Link UI for testing |

### Deploying edge functions:
```bash
npx supabase functions deploy <function-name> --no-verify-jwt --project-ref ibsisfnjxeowvdtvgzff
```

---

## 5. Database Schema

### `user_financial_data` table:
```sql
user_id           TEXT PRIMARY KEY
plaid_item_id     TEXT
institution_name  TEXT
institution_id    TEXT
balances          JSONB          -- Raw Plaid balance response
asset_report      JSONB          -- Raw Plaid asset report
asset_report_token TEXT           -- For polling pending reports
investments       JSONB          -- Raw Plaid holdings + securities
available_products JSONB         -- { balance: true, assets: false, investments: true }
status            TEXT           -- 'complete' | 'partial' | 'failed'
fetch_errors      JSONB          -- { balance: 'error msg', ... }
updated_at        TIMESTAMPTZ
```

### `onboarding_data` table:
```sql
user_id           TEXT PRIMARY KEY
step_1_data       JSONB          -- Account tier
step_2_data       JSONB          -- Personal info (name, DOB, etc.)
...
step_15_data      JSONB          -- Final step
current_step      INTEGER        -- Last completed step
completed_at      TIMESTAMPTZ    -- When all 15 steps done
```

---

## 6. KYC Screen Components

| Screen | File | What it does |
|--------|------|-------------|
| Financial Link | `KycFinancialLinkScreen.tsx` | Plaid bank linking + 3 product cards |
| KYC Flow Container | `KycFlowContainer.tsx` | Orchestrates the A2A KYC check flow |
| KYC Flow Page | `pages/kyc-flow/index.tsx` | Entry page for KYC attestation |

### Design tokens (CTA color):
- **Primary CTA**: `#2B8CEE` (blue)
- **Success state**: `#34C759` (green)
- **Error state**: `#FF3B30` (red)

---

## 7. Types (`src/types/kyc.ts`)

Key types:
- `FinancialVerificationResult` — what FinancialLink returns to onboarding
- `KycFlowState` — state machine for the KYC check flow
- `FlowStep` — steps in the KYC verification flow
- `KycCheckRequest/Response` — A2A KYC attestation API types

---

## 8. Testing

### Sandbox testing (bypasses Plaid UI):
```typescript
import { createSandboxTestItem } from './services/plaid/plaidService';
const result = await createSandboxTestItem(userId, 'ins_109508');
// Creates test item → exchange → fetch all → save to DB
```

### Test files:
- `tests/plaidIntegration.test.ts` — Unit tests for plaidService
- `tests/plaidSandboxLive.test.ts` — Live sandbox integration tests

---

## 9. Key PRs

| PR | What |
|----|------|
| #326 | Plaid sandbox integration (edge functions, tests, UI) |
| #327 | Wire Plaid as mandatory pre-step before onboarding |
| #328 | OAuth redirect fix for Chase/Wells Fargo/BofA |
| #329 | CTA color #2B8CEE + Continue button visibility gating |

---

## 10. Important Notes

1. **Plaid Dashboard Config Required**: Register redirect URIs in Plaid Dashboard:
   - `https://www.hushhtech.com/onboarding/financial-link` (production)
   - `http://localhost:5173/onboarding/financial-link` (dev)

2. **Environment Variables** (Supabase Edge Functions):
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET`
   - `PLAID_ENV` (sandbox/development/production)

3. **Supabase Project**: `ibsisfnjxeowvdtvgzff`
