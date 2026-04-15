import config from "../../resources/config/config";

const DEFAULT_NDA_GENERATION_BASE_URL =
  "https://hushhtech-nda-generation-53407187172.us-central1.run.app";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

export function getSupabaseBaseUrl(): string {
  return trimTrailingSlash(config.SUPABASE_URL);
}

export function getSupabaseRpcUrl(rpcName: string): string {
  return `${getSupabaseBaseUrl()}/rest/v1/rpc/${rpcName}`;
}

export function getSupabaseStoragePublicUrl(
  bucket: string,
  objectPath = ""
): string {
  const baseUrl = `${getSupabaseBaseUrl()}/storage/v1/object/public/${trimLeadingSlash(
    bucket
  )}`;

  if (!objectPath) {
    return baseUrl;
  }

  return `${baseUrl}/${trimLeadingSlash(objectPath)}`;
}

export function getNdaGenerationBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_NDA_GENERATION_URL?.trim();
  return trimTrailingSlash(
    configuredBaseUrl || DEFAULT_NDA_GENERATION_BASE_URL
  );
}

export function getNdaGenerationUrl(): string {
  return `${getNdaGenerationBaseUrl()}/generate-nda`;
}
