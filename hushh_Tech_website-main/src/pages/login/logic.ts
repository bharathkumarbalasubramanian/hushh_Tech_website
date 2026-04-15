/**
 * Login Page — All Business Logic
 *
 * Contains:
 * - Auth session check & redirect
 * - OAuth sign-in handlers (Apple, Google)
 * - Loading state management with absolute max timeout
 *   to prevent infinite loading on any failure path.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import config from "../../resources/config/config";
import {
  redirectToUrl,
  resolveOAuthHost,
} from "../../auth/authHost";
import type { OAuthStartResult } from "../../auth/session";
import { DEFAULT_AUTH_REDIRECT, sanitizeInternalRedirect } from "../../utils/security";
import { useAuthSession } from "../../auth/AuthSessionProvider";
import { normalizeLegacyOnboardingRedirectTarget } from "../../services/onboarding/flow";

/* ─── Types ─── */
export interface LoginLogic {
  isLoading: boolean;
  isSigningIn: boolean;
  bootTimedOut: boolean;
  oauthError: string | null;
  oauthFallbackUrl: string | null;
  handleAppleSignIn: () => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
}

/* ─── Constants ─── */
const BOOT_TIMEOUT_MS = 4000;
const MAX_LOADING_TIMEOUT_MS = 5000;

/* ─── Main Hook ─── */
export const useLoginLogic = (): LoginLogic => {
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [maxLoadingTimedOut, setMaxLoadingTimedOut] = useState(false);
  const [oauthError, setOAuthError] = useState<string | null>(null);
  const [oauthFallbackUrl, setOAuthFallbackUrl] = useState<string | null>(null);
  const { status, startOAuth } = useAuthSession();
  const hasLoggedRedirectRef = useRef(false);

  const hostResolution = useMemo(
    () =>
      resolveOAuthHost(
        window.location.pathname,
        window.location.search,
        config.redirect_url,
        window.location.origin
      ),
    []
  );
  const shouldRedirectToSupportedHost = !hostResolution.supported;

  // Stable redirect path — computed once from URL params
  const { redirectPath, sanitizedRedirectPath } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const sanitized = sanitizeInternalRedirect(
      params.get("redirect"),
      DEFAULT_AUTH_REDIRECT
    );
    return {
      sanitizedRedirectPath: sanitized,
      redirectPath: normalizeLegacyOnboardingRedirectTarget(sanitized),
    };
  }, []);

  /* ─── Boot timeout: fires after 4s if auth status stays "booting" ─── */
  useEffect(() => {
    if (status !== "booting") {
      setBootTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.error("[Login] Auth bootstrap timed out; showing manual sign-in UI", {
        pathname: window.location.pathname,
        search: window.location.search,
      });
      setBootTimedOut(true);
    }, BOOT_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  /* ─── Absolute max loading timeout: ALWAYS show buttons after 5s ─── */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMaxLoadingTimedOut(true);

      // Log diagnostics so we can see WHY the page was still loading
      console.warn("[Login] Absolute max loading timeout reached (5s)", {
        status,
        shouldRedirectToSupportedHost,
        bootTimedOut,
        origin: window.location.origin,
        canonicalEntryUrl: hostResolution.canonicalEntryUrl,
        configRedirectUrl: config.redirect_url,
      });
    }, MAX_LOADING_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
    // Run once on mount — never resets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Log unsupported host for production debugging ─── */
  useEffect(() => {
    if (shouldRedirectToSupportedHost && !hasLoggedRedirectRef.current) {
      hasLoggedRedirectRef.current = true;
      console.warn("[Login] Unsupported OAuth host — redirecting", {
        currentOrigin: window.location.origin,
        canonicalEntryUrl: hostResolution.canonicalEntryUrl,
        configRedirectUrl: config.redirect_url,
        supported: hostResolution.supported,
      });
    }
  }, [hostResolution.canonicalEntryUrl, hostResolution.supported, shouldRedirectToSupportedHost]);

  useEffect(() => {
    if (status !== "booting") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.warn("[Login] Auth session is still booting", {
        pathname: window.location.pathname,
        search: window.location.search,
      });
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  useEffect(() => {
    if (shouldRedirectToSupportedHost) {
      redirectToUrl(hostResolution.canonicalEntryUrl);
    }
  }, [hostResolution.canonicalEntryUrl, shouldRedirectToSupportedHost]);

  useEffect(() => {
    if (
      shouldRedirectToSupportedHost ||
      redirectPath === sanitizedRedirectPath
    ) {
      return;
    }

    navigate(
      `${window.location.pathname}?redirect=${encodeURIComponent(redirectPath)}`,
      { replace: true }
    );
  }, [navigate, redirectPath, sanitizedRedirectPath, shouldRedirectToSupportedHost]);

  /* Auth session listener — redirect if already logged in */
  useEffect(() => {
    if (shouldRedirectToSupportedHost) {
      return;
    }

    if (status === "authenticated") {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, shouldRedirectToSupportedHost, status]);

  const handleOAuthFailure = useCallback(
    (result: Extract<OAuthStartResult, { ok: false }>) => {
      setIsSigningIn(false);
      if (result.reason === "unsupported_host" && result.redirectTo) {
        redirectToUrl(result.redirectTo);
        return;
      }

      setOAuthError(result.message);
      setOAuthFallbackUrl(result.redirectTo || null);
    },
    []
  );

  /* Apple OAuth — prevent double-clicks */
  const handleAppleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setOAuthError(null);
    setOAuthFallbackUrl(null);
    const result = await startOAuth("apple");
    if (!result.ok) {
      handleOAuthFailure(result);
    }
  }, [handleOAuthFailure, isSigningIn, startOAuth]);

  /* Google OAuth — prevent double-clicks */
  const handleGoogleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setOAuthError(null);
    setOAuthFallbackUrl(null);
    const result = await startOAuth("google");
    if (!result.ok) {
      handleOAuthFailure(result);
    }
  }, [handleOAuthFailure, isSigningIn, startOAuth]);

  // Compute isLoading: allow boot timeout OR absolute max timeout to force-show buttons.
  // The maxLoadingTimedOut acts as an absolute safety net — no matter what, after 5s
  // the loading screen disappears and buttons are shown.
  const isBootLoading = status === "booting" && !bootTimedOut;
  const isRedirectLoading = shouldRedirectToSupportedHost;
  const isLoading = (isRedirectLoading || isBootLoading) && !maxLoadingTimedOut;

  return {
    isLoading,
    isSigningIn,
    bootTimedOut,
    oauthError,
    oauthFallbackUrl,
    handleAppleSignIn,
    handleGoogleSignIn,
  };
};
