export function resolvePlaidRedirectUri(
  configuredRedirect: string | null | undefined,
  currentOrigin: string,
  currentPathname: string
): string {
  if (typeof configuredRedirect === "string" && configuredRedirect.trim()) {
    return configuredRedirect.trim();
  }

  return `${currentOrigin}${currentPathname}`;
}

export function shouldUsePlaidRedirectUri(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
