import axios from "axios";
import config from "../../resources/config/config";
import { getNdaGenerationUrl, getSupabaseRpcUrl } from "../runtime/mainWeb";

export type AccessStatus = string;

export interface NdaMetadataResponse {
  metadata?: Record<string, unknown>;
  message?: string;
  status?: string;
}

interface RequestFileAccessParams {
  investorType: string;
  metadata: string;
}

function getAuthenticatedHeaders(accessToken: string) {
  return {
    apikey: config.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function postRpc<T>(
  rpcName: string,
  accessToken: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await axios.post<T>(getSupabaseRpcUrl(rpcName), body, {
    headers: getAuthenticatedHeaders(accessToken),
  });
  return response.data;
}

export function checkAccessStatus(accessToken: string) {
  return postRpc<AccessStatus>("check_access_status", accessToken);
}

export function getNdaMetadata(accessToken: string) {
  return postRpc<NdaMetadataResponse>("get_nda_metadata", accessToken);
}

export function acceptNda(accessToken: string) {
  return postRpc<AccessStatus>("accept_nda_v2", accessToken);
}

export function requestFileAccess(
  accessToken: string,
  params: RequestFileAccessParams
) {
  return postRpc<AccessStatus>("request_file_access", accessToken, {
    investor_type: params.investorType,
    metadata: params.metadata,
  });
}

export async function generateNdaPdfBlob(
  accessToken: string,
  metadata: Record<string, unknown>
): Promise<Blob> {
  const response = await axios.post(getNdaGenerationUrl(), { metadata }, {
    headers: {
      "Content-Type": "application/json",
      "jwt-token": accessToken,
    },
    responseType: "blob",
  });

  return response.data as Blob;
}
