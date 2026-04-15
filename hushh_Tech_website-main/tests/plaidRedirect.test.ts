import { describe, expect, it } from "vitest";
import {
  resolvePlaidRedirectUri,
  shouldUsePlaidRedirectUri,
} from "../src/services/plaid/redirect";

describe("Plaid redirect helpers", () => {
  it("prefers the configured redirect URI when present", () => {
    expect(
      resolvePlaidRedirectUri(
        "https://hushhtech.com/onboarding/financial-link",
        "https://hushh-tech-website-646258530541.us-central1.run.app",
        "/onboarding/financial-link"
      )
    ).toBe("https://hushhtech.com/onboarding/financial-link");
  });

  it("falls back to the current origin and pathname when no env is configured", () => {
    expect(
      resolvePlaidRedirectUri(
        undefined,
        "http://localhost:5173",
        "/onboarding/financial-link"
      )
    ).toBe("http://localhost:5173/onboarding/financial-link");
  });

  it("only sends redirect_uri to Plaid for HTTPS URLs", () => {
    expect(shouldUsePlaidRedirectUri("https://hushhtech.com/onboarding/financial-link")).toBe(true);
    expect(shouldUsePlaidRedirectUri("http://localhost:5173/onboarding/financial-link")).toBe(false);
  });
});
