import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import {
  buildClientConfig,
  createSupabaseClient,
} from "../src/resources/config/config";

describe("client auth config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockReturnValue({ auth: {} });
  });

  it("creates a Supabase client when required env vars are present", () => {
    const clientConfig = buildClientConfig(
      {
        VITE_SUPABASE_URL: "https://ibsisfnjxeowvdtvgzff.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
        VITE_SUPABASE_REDIRECT_URL: "https://hushhtech.com/auth/callback",
      },
      "https://hushhtech.com/auth/callback"
    );

    const client = createSupabaseClient(clientConfig);

    expect(createClientMock).toHaveBeenCalledWith(
      "https://ibsisfnjxeowvdtvgzff.supabase.co",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          detectSessionInUrl: true,
        }),
      })
    );
    expect(client).toEqual({ auth: {} });
  });

  it("fails cleanly when required env vars are absent", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const clientConfig = buildClientConfig(
      {},
      "https://hushhtech.com/auth/callback"
    );
    const client = createSupabaseClient(clientConfig);

    expect(client).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("normalizes redirect URLs before storing config", () => {
    const clientConfig = buildClientConfig(
      {
        VITE_SUPABASE_URL: "https://ibsisfnjxeowvdtvgzff.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
        VITE_SUPABASE_REDIRECT_URL: "http://localhost:5173/",
      },
      "https://hushhtech.com/auth/callback"
    );

    expect(clientConfig.redirect_url).toBe("http://localhost:5173/auth/callback");
  });
});
