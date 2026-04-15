import {
  DEFAULT_AUTH_REDIRECT,
  sanitizeInternalRedirect,
} from "../utils/security";
import { normalizeLegacyOnboardingRedirectTarget } from "../services/onboarding/flow";

export const PROD_AUTH_ORIGIN = "https://hushhtech.com";
export const UAT_AUTH_ORIGIN = "https://uat.hushhtech.com";

export const SUPPORTED_PUBLIC_AUTH_ORIGINS = [
  PROD_AUTH_ORIGIN,
  UAT_AUTH_ORIGIN,
] as const;

export const SUPPORTED_LOCAL_AUTH_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
] as const;

const supportedPublicOrigins = new Set<string>(SUPPORTED_PUBLIC_AUTH_ORIGINS);
const supportedLocalOrigins = new Set<string>(SUPPORTED_LOCAL_AUTH_ORIGINS);

function parseUrl(value: string | null | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function normalizeOAuthRedirectUrl(
  value: string | null | undefined,
  fallback = `${PROD_AUTH_ORIGIN}/auth/callback`
): string {
  const parsed = parseUrl(value);
  if (!parsed) {
    return fallback;
  }

  const normalized = new URL(parsed.toString());
  if (!normalized.pathname || normalized.pathname === "/") {
    normalized.pathname = "/auth/callback";
    normalized.search = "";
    normalized.hash = "";
  }

  return normalized.toString();
}

export function getCanonicalAuthOrigin(
  configuredRedirectUrl: string | null | undefined,
  fallbackOrigin = PROD_AUTH_ORIGIN
): string {
  const configuredOrigin = parseUrl(configuredRedirectUrl)?.origin;
  if (
    configuredOrigin &&
    (supportedPublicOrigins.has(configuredOrigin) ||
      supportedLocalOrigins.has(configuredOrigin))
  ) {
    return configuredOrigin;
  }

  if (supportedLocalOrigins.has(fallbackOrigin)) {
    return fallbackOrigin;
  }

  return PROD_AUTH_ORIGIN;
}

export function isSupportedOAuthOrigin(
  origin: string,
  configuredRedirectUrl: string | null | undefined
): boolean {
  if (supportedLocalOrigins.has(origin)) {
    return true;
  }

  return origin === getCanonicalAuthOrigin(configuredRedirectUrl, origin);
}

export function getOAuthCallbackUrl(
  currentOrigin: string,
  configuredRedirectUrl: string | null | undefined
): string {
  const originToUse = isSupportedOAuthOrigin(currentOrigin, configuredRedirectUrl)
    ? currentOrigin
    : getCanonicalAuthOrigin(configuredRedirectUrl, currentOrigin);

  return `${originToUse}/auth/callback`;
}

function getAuthEntryPath(pathname: string): "/login" | "/signup" {
  return pathname.toLowerCase().startsWith("/signup") ? "/signup" : "/login";
}

export function buildCanonicalAuthEntryUrl(
  pathname: string,
  search: string,
  configuredRedirectUrl: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT
): string {
  const canonicalOrigin = getCanonicalAuthOrigin(configuredRedirectUrl);
  const params = new URLSearchParams(search);
  const canonicalParams = new URLSearchParams();
  const redirect = params.get("redirect");

  if (redirect) {
    canonicalParams.set(
      "redirect",
      normalizeLegacyOnboardingRedirectTarget(
        sanitizeInternalRedirect(redirect, fallback)
      )
    );
  }

  const query = canonicalParams.toString();
  return `${canonicalOrigin}${getAuthEntryPath(pathname)}${
    query ? `?${query}` : ""
  }`;
}

export function redirectToUrl(url: string) {
  window.location.assign(url);
}

export interface OAuthHostResolution {
  canonicalEntryUrl: string;
  canonicalOrigin: string;
  callbackUrl: string;
  supported: boolean;
}

export function resolveOAuthHost(
  pathname: string,
  search: string,
  configuredRedirectUrl: string | null | undefined,
  currentOrigin: string
): OAuthHostResolution {
  const supported = isSupportedOAuthOrigin(currentOrigin, configuredRedirectUrl);
  const canonicalOrigin = getCanonicalAuthOrigin(
    configuredRedirectUrl,
    currentOrigin
  );

  return {
    canonicalEntryUrl: buildCanonicalAuthEntryUrl(
      pathname,
      search,
      configuredRedirectUrl
    ),
    canonicalOrigin,
    callbackUrl: getOAuthCallbackUrl(currentOrigin, configuredRedirectUrl),
    supported,
  };
}
