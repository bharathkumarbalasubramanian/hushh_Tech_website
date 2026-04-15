import { describe, expect, it } from "vitest";

import {
  buildCanonicalAuthEntryUrl,
  getCanonicalAuthOrigin,
  normalizeOAuthRedirectUrl,
  resolveOAuthHost,
} from "../src/auth/authHost";

describe("auth host policy", () => {
  it("normalizes redirect URLs that omit the callback path", () => {
    expect(normalizeOAuthRedirectUrl("http://localhost:5173/")).toBe(
      "http://localhost:5173/auth/callback"
    );
  });

  it("uses the configured UAT callback origin when present", () => {
    expect(
      getCanonicalAuthOrigin("https://uat.hushhtech.com/auth/callback")
    ).toBe("https://uat.hushhtech.com");
  });

  it("routes unsupported hosts to the canonical public login URL", () => {
    const resolution = resolveOAuthHost(
      "/login",
      "?redirect=%2Fprofile",
      "https://hushhtech.com/auth/callback",
      "https://hushh-tech-website-646258530541.us-central1.run.app"
    );

    expect(resolution.supported).toBe(false);
    expect(resolution.canonicalOrigin).toBe("https://hushhtech.com");
    expect(resolution.canonicalEntryUrl).toBe(
      "https://hushhtech.com/login?redirect=%2Fprofile"
    );
  });

  it("preserves the signup path when canonicalizing an unsupported host", () => {
    expect(
      buildCanonicalAuthEntryUrl(
        "/signup",
        "?redirect=%2Fdelete-account",
        "https://hushhtech.com/auth/callback"
      )
    ).toBe("https://hushhtech.com/signup?redirect=%2Fdelete-account");
  });

  it("normalizes legacy investor-profile redirects onto the financial-link entry", () => {
    expect(
      buildCanonicalAuthEntryUrl(
        "/login",
        "?redirect=%2Finvestor-profile",
        "https://hushhtech.com/auth/callback"
      )
    ).toBe("https://hushhtech.com/login?redirect=%2Fonboarding%2Ffinancial-link");
  });
});
