import { beforeEach, describe, expect, it, vi } from "vitest";

const createDeleteAccountAdminClientFromEnvMock = vi.fn();
const executeDeleteAccountMock = vi.fn();

vi.mock("../api/delete-account-service.js", () => ({
  createDeleteAccountAdminClientFromEnv: (...args) =>
    createDeleteAccountAdminClientFromEnvMock(...args),
  executeDeleteAccount: (...args) => executeDeleteAccountMock(...args),
}));

import deleteAccountHandler from "../api/delete-account.js";

const createResponse = () => {
  let statusCode = 200;
  let body;

  return {
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
};

describe("delete-account API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-POST requests", async () => {
    const res = createResponse();

    await deleteAccountHandler({ method: "GET", headers: {} }, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
    expect(executeDeleteAccountMock).not.toHaveBeenCalled();
  });

  it("passes the auth header through to the delete-account service", async () => {
    createDeleteAccountAdminClientFromEnvMock.mockReturnValue({
      adminClient: { marker: "admin" },
      auditSecret: "audit-secret",
    });
    executeDeleteAccountMock.mockResolvedValue({
      status: 200,
      body: { success: true, deletedScopes: [], retainedScopes: [] },
    });

    const res = createResponse();
    await deleteAccountHandler(
      {
        method: "POST",
        headers: { authorization: "Bearer live-token" },
      },
      res
    );

    expect(executeDeleteAccountMock).toHaveBeenCalledWith({
      adminClient: { marker: "admin" },
      authHeader: "Bearer live-token",
      auditSecret: "audit-secret",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      deletedScopes: [],
      retainedScopes: [],
    });
  });

  it("fails closed when the server env is missing", async () => {
    createDeleteAccountAdminClientFromEnvMock.mockImplementation(() => {
      throw new Error("Supabase server environment variables are missing");
    });

    const res = createResponse();
    await deleteAccountHandler(
      {
        method: "POST",
        headers: {},
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: "Server configuration error",
      details: "Supabase server environment variables are missing",
    });
  });
});
