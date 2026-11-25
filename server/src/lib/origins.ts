function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Collect trusted origins from TRUSTED_ORIGINS, BETTER_AUTH_URL, and Railway's public domain.
 */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  for (const raw of (process.env.TRUSTED_ORIGINS ?? "").split(",")) {
    const cleaned = normalizeOrigin(raw);
    if (cleaned) {
      origins.add(cleaned);
    }
  }

  for (const candidate of [
    process.env.BETTER_AUTH_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined,
  ]) {
    if (!candidate) continue;
    const cleaned = normalizeOrigin(candidate);
    if (cleaned) {
      origins.add(cleaned);
    }
  }

  return [...origins];
}

