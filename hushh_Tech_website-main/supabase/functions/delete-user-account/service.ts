import {
  buildDeleteAccountSuccessPayload,
  buildSignedNdaAssetPathFromUrl,
  dedupeDeleteAccountPaths,
} from "../_shared/deleteAccount.ts";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

type DeleteAccountResponseBody =
  | ReturnType<typeof buildDeleteAccountSuccessPayload>
  | {
      success?: false;
      error: string;
      details?: string;
      code?: number;
    };

type QueryResponse<T> = Promise<{ data: T; error: SupabaseErrorLike | null }>;

export interface DeleteAccountAdminClientLike {
  auth: {
    getUser: (
      jwt: string
    ) => QueryResponse<{ user: { id: string; email?: string | null } | null }>;
    admin: {
      deleteUser: (userId: string) => QueryResponse<null>;
    };
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => QueryResponse<Record<string, unknown>[]>;
    };
  };
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => QueryResponse<Record<string, unknown> | null>;
  storage: {
    from: (bucket: string) => {
      list: (
        path?: string,
        options?: Record<string, unknown>
      ) => QueryResponse<Array<{ name: string; id?: string | null }>>;
      remove: (paths: string[]) => QueryResponse<unknown>;
    };
  };
}

export interface DeleteAccountExecutionResult {
  status: number;
  body: DeleteAccountResponseBody;
}

function buildErrorResult(
  status: number,
  error: string,
  details?: string,
  code?: number
): DeleteAccountExecutionResult {
  return {
    status,
    body: {
      success: false,
      error,
      details,
      code,
    },
  };
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  return !token || token === authHeader ? null : token;
}

function isRelationMissingError(error: SupabaseErrorLike | null | undefined) {
  return (
    error?.code === "42P01" ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

function resolveUserValidationMessage(error: SupabaseErrorLike | null | undefined) {
  if (error?.status === 401 || error?.message?.includes("expired")) {
    return "Your session has expired. Please log out, log back in, and try again.";
  }

  return error?.message || "Invalid or expired token";
}

async function selectScopedUrls(
  adminClient: DeleteAccountAdminClientLike,
  table: string,
  column: string,
  userId: string
) {
  const { data, error } = await adminClient
    .from(table)
    .select(column)
    .eq("user_id", userId);

  if (error) {
    if (isRelationMissingError(error)) {
      return [] as string[];
    }

    throw new Error(`Failed to collect ${table}.${column}: ${error.message || error.code}`);
  }

  return (data || [])
    .map((row) => row?.[column])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

async function deleteBucketPaths(
  adminClient: DeleteAccountAdminClientLike,
  bucket: string,
  paths: string[]
) {
  if (paths.length === 0) return 0;

  const { error } = await adminClient.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error(`Failed to delete storage objects from ${bucket}: ${error.message || error.code}`);
  }

  return paths.length;
}

async function deleteHushhAiMedia(
  adminClient: DeleteAccountAdminClientLike,
  userId: string
) {
  const { data, error } = await adminClient.storage
    .from("hushh-ai-media")
    .list(userId, { limit: 1000 });

  if (error) {
    throw new Error(`Failed to list Hushh AI media: ${error.message || error.code}`);
  }

  const filePaths = (data || [])
    .filter((entry) => typeof entry?.name === "string" && entry.name.length > 0)
    .map((entry) => `${userId}/${entry.name}`);

  return deleteBucketPaths(adminClient, "hushh-ai-media", filePaths);
}

function resolveArchivedPaymentAuditRows(
  rpcData: Record<string, unknown> | null
) {
  if (!rpcData) return 0;

  const rawValue =
    rpcData.archived_payment_audit_rows ?? rpcData.archivedPaymentAuditRows;

  return typeof rawValue === "number" ? rawValue : 0;
}

export async function executeDeleteUserAccount(
  adminClient: DeleteAccountAdminClientLike,
  authHeader: string | null
): Promise<DeleteAccountExecutionResult> {
  const jwt = extractBearerToken(authHeader);

  if (!authHeader) {
    return buildErrorResult(401, "Missing authorization header");
  }

  if (!jwt) {
    return buildErrorResult(
      401,
      "Invalid authorization header format. Expected: Bearer <token>"
    );
  }

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(jwt);

  if (userError || !user) {
    return buildErrorResult(
      401,
      resolveUserValidationMessage(userError),
      userError?.message || "Token validation failed",
      userError?.status || 401
    );
  }

  const userId = user.id;

  try {
    const [ndaSignatureUrls, onboardingNdaUrls] = await Promise.all([
      selectScopedUrls(adminClient, "nda_signatures", "pdf_url", userId),
      selectScopedUrls(adminClient, "onboarding_data", "nda_pdf_url", userId),
    ]);

    const ndaAssetPaths = dedupeDeleteAccountPaths(
      [...ndaSignatureUrls, ...onboardingNdaUrls].map(buildSignedNdaAssetPathFromUrl)
    );

    const hushhAiMediaObjectsDeleted = await deleteHushhAiMedia(adminClient, userId);
    const ndaAssetObjectsDeleted = await deleteBucketPaths(
      adminClient,
      "assets",
      ndaAssetPaths
    );

    const { data: purgeData, error: purgeError } = await adminClient.rpc(
      "purge_user_account",
      { p_user_id: userId }
    );

    if (purgeError) {
      return buildErrorResult(
        500,
        "Failed to purge user data",
        purgeError.message || purgeError.code
      );
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return buildErrorResult(
        500,
        "Failed to delete user account",
        deleteAuthError.message || deleteAuthError.code
      );
    }

    return {
      status: 200,
      body: buildDeleteAccountSuccessPayload({
        archivedPaymentAuditRows: resolveArchivedPaymentAuditRows(purgeData),
        hushhAiMediaObjectsDeleted,
        ndaAssetObjectsDeleted,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildErrorResult(500, "Failed to delete user account", message);
  }
}
