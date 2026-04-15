/**
 * Platform detection utilities for the web app.
 */

const getUserAgent = (): string =>
  typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

export function isNativeApp(): boolean {
  return false;
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(getUserAgent());
}

export function isAndroid(): boolean {
  return /android/.test(getUserAgent());
}

export function isWeb(): boolean {
  return true;
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
}

export function getBaseUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://hushhtech.com';
}

/**
 * Get the OAuth redirect URL for the current platform
 */
export function getOAuthRedirectUrl(): string {
  return `${getBaseUrl()}/auth/callback`;
}

export function getDeepLinkScheme(): string {
  return 'hushh';
}

export function getDeepLinkAuthUrl(): string {
  return `${getDeepLinkScheme()}://auth/callback`;
}
