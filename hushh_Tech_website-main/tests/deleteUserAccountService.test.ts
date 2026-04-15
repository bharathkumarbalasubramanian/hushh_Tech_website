import { describe, expect, it, vi } from "vitest";

import { executeDeleteUserAccount } from "../supabase/functions/delete-user-account/service";

function createAdminClient(options?: {
  authDeleteError?: { message: string } | null;
  getUserError?: { message: string; status?: number } | null;
  hushhAiFiles?: Array<{ name: string }>;
  ndaSignatureRows?: Array<{ pdf_url: string }>;
  onboardingRows?: Array<{ nda_pdf_url: string }>;
  rpcData?: Record<string, unknown> | null;
  rpcError?: { message: string } | null;
  storageRemoveError?: { message: string } | null;
}) {
  const {
    authDeleteError = null,
    getUserError = null,
    hushhAiFiles = [{ name: "17123-file.pdf" }],
    ndaSignatureRows = [
      {
        pdf_url:
          "https://example.supabase.co/storage/v1/object/public/assets/signed-ndas/nda_user-123_171.pdf",
      },
    ],
    onboardingRows = [],
    rpcData = { archived_payment_audit_rows: 1 },
    rpcError = null,
    storageRemoveError = null,
  } = options ?? {};

  const removeMock = vi.fn(async () => ({
    data: null,
    error: storageRemoveError,
  }));
  const listMock = vi.fn(async () => ({
    data: hushhAiFiles,
    error: null,
  }));
  const getUserMock = vi.fn(async () => ({
    data: {
      user: getUserError ? null : { id: "user-123", email: "user@example.com" },
    },
    error: getUserError,
  }));
  const deleteUserMock = vi.fn(async () => ({ data: null, error: authDeleteError }));
  const rpcMock = vi.fn(async () => ({ data: rpcData, error: rpcError }));
  const fromMock = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(async () => {
        if (table === "nda_signatures") {
          return { data: ndaSignatureRows, error: null };
        }

        if (table === "onboarding_data") {
          return { data: onboardingRows, error: null };
        }

        return { data: [], error: null };
      }),
    })),
  }));
  const storageFromMock = vi.fn(() => ({
    list: listMock,
    remove: removeMock,
  }));

  return {
    client: {
      auth: {
        getUser: getUserMock,
        admin: {
          deleteUser: deleteUserMock,
        },
      },
      from: fromMock,
      rpc: rpcMock,
      storage: {
        from: storageFromMock,
      },
    },
    mocks: {
      deleteUserMock,
      fromMock,
      getUserMock,
      listMock,
      removeMock,
      rpcMock,
      storageFromMock,
    },
  };
}

describe("delete-user-account service", () => {
  it("deletes storage first, then purges data, then deletes auth", async () => {
    const { client, mocks } = createAdminClient({
      onboardingRows: [
        {
          nda_pdf_url:
            "https://example.supabase.co/storage/v1/object/public/assets/signed-ndas/nda_user-123_172.pdf",
        },
      ],
    });

    const result = await executeDeleteUserAccount(
      client,
      "Bearer access-token"
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      retainedScopes: ["audit.payment_minimum"],
      details: {
        archivedPaymentAuditRows: 1,
        hushhAiMediaObjectsDeleted: 1,
        ndaAssetObjectsDeleted: 2,
      },
    });

    expect(mocks.storageFromMock.mock.calls).toEqual([
      ["hushh-ai-media"],
      ["hushh-ai-media"],
      ["assets"],
    ]);
    expect(mocks.removeMock).toHaveBeenNthCalledWith(1, ["user-123/17123-file.pdf"]);
    expect(mocks.removeMock).toHaveBeenNthCalledWith(2, [
      "signed-ndas/nda_user-123_171.pdf",
      "signed-ndas/nda_user-123_172.pdf",
    ]);
    expect(mocks.rpcMock).toHaveBeenCalledWith("purge_user_account", {
      p_user_id: "user-123",
    });
    expect(mocks.deleteUserMock).toHaveBeenCalledWith("user-123");
  });

  it("rejects a malformed authorization header", async () => {
    const { client, mocks } = createAdminClient();

    const result = await executeDeleteUserAccount(client, "access-token");

    expect(result).toEqual({
      status: 401,
      body: {
        success: false,
        error: "Invalid authorization header format. Expected: Bearer <token>",
        details: undefined,
        code: undefined,
      },
    });
    expect(mocks.getUserMock).not.toHaveBeenCalled();
    expect(mocks.rpcMock).not.toHaveBeenCalled();
  });

  it("fails closed when storage cleanup fails", async () => {
    const { client, mocks } = createAdminClient({
      storageRemoveError: { message: "remove failed" },
    });

    const result = await executeDeleteUserAccount(
      client,
      "Bearer access-token"
    );

    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({
      success: false,
      error: "Failed to delete user account",
    });
    expect(mocks.rpcMock).not.toHaveBeenCalled();
    expect(mocks.deleteUserMock).not.toHaveBeenCalled();
  });
});
