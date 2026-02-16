import { getTursoDbDomainSuffix } from "@/lib/env"

const LIBSQL_PREFIX = "libsql://"
const TURSO_PUBLIC_SUFFIX = ".turso.io"

function extractHostname(value: string): string {
  const stripped = value
    .trim()
    .replace(/^libsql:\/\//i, "")
    .replace(/^https?:\/\//i, "")

  const hostname = stripped.split("/")[0]?.trim().replace(/\.$/, "")
  if (!hostname) {
    throw new Error("Invalid Turso hostname")
  }

  return hostname
}

function applySuffixOverride(hostname: string, overrideSuffix: string): string {
  const lowerHost = hostname.toLowerCase()
  const lowerSuffix = overrideSuffix.toLowerCase()

  if (lowerHost === lowerSuffix || lowerHost.endsWith(`.${lowerSuffix}`)) {
    return hostname
  }

  if (lowerHost.endsWith(TURSO_PUBLIC_SUFFIX)) {
    return `${hostname.slice(0, hostname.length - TURSO_PUBLIC_SUFFIX.length)}.${overrideSuffix}`
  }

  return hostname
}

/**
 * Build a libsql URL from Turso hostname and optionally apply white-label suffix.
 */
export function buildLibsqlUrlFromHostname(hostname: string): string {
  const normalizedHost = extractHostname(hostname)
  const overrideSuffix = getTursoDbDomainSuffix()
  const finalHost = overrideSuffix
    ? applySuffixOverride(normalizedHost, overrideSuffix)
    : normalizedHost

  return `${LIBSQL_PREFIX}${finalHost}`
}

/**
 * Rewrite existing libsql URLs to optional white-label domain suffix.
 */
export function applyTursoDomainAlias(url: string): string {
  const normalized = url.trim()
  if (!normalized.toLowerCase().startsWith(LIBSQL_PREFIX)) {
    return normalized
  }

  const hostname = extractHostname(normalized)
  return buildLibsqlUrlFromHostname(hostname)
}
