import { describe, expect, it } from "vitest";

import { buildLoginRedirectPath } from "../src/auth/routePolicy";
import {
  FINANCIAL_LINK_ROUTE,
  getFinancialLinkContinuationRoute,
  normalizeLegacyOnboardingRedirectTarget,
  resolveFinancialLinkStatus,
} from "../src/services/onboarding/flow";

describe("onboarding flow helpers", () => {
  it("canonicalizes legacy investor-profile redirects to the financial-link entry", () => {
    expect(normalizeLegacyOnboardingRedirectTarget("/investor-profile")).toBe(
      FINANCIAL_LINK_ROUTE
    );
    expect(buildLoginRedirectPath("/investor-profile")).toBe(
      `/login?redirect=${encodeURIComponent(FINANCIAL_LINK_ROUTE)}`
    );
  });

  it("treats completed financial data as a completed financial-link gate", () => {
    expect(resolveFinancialLinkStatus("pending", "complete")).toBe("completed");
    expect(resolveFinancialLinkStatus(undefined, "partial")).toBe("completed");
  });

  it("resumes financial-link continuations from step 1 when no later step exists", () => {
    expect(getFinancialLinkContinuationRoute(0)).toBe("/onboarding/step-1");
    expect(getFinancialLinkContinuationRoute(1)).toBe("/onboarding/step-1");
    // raw step 4 → combined step-3 after merging country + address steps
    expect(getFinancialLinkContinuationRoute(4)).toBe("/onboarding/step-3");
  });
});
