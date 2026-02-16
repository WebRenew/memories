import { afterEach, describe, expect, it } from "vitest"
import { applyTursoDomainAlias, buildLibsqlUrlFromHostname } from "./turso-domain"

const originalDomainSuffix = process.env.TURSO_DB_DOMAIN_SUFFIX

afterEach(() => {
  if (originalDomainSuffix === undefined) {
    delete process.env.TURSO_DB_DOMAIN_SUFFIX
  } else {
    process.env.TURSO_DB_DOMAIN_SUFFIX = originalDomainSuffix
  }
})

describe("turso domain aliasing", () => {
  it("keeps default turso hostname when no override is set", () => {
    delete process.env.TURSO_DB_DOMAIN_SUFFIX

    expect(buildLibsqlUrlFromHostname("demo.turso.io")).toBe("libsql://demo.turso.io")
  })

  it("rewrites turso hostnames when a white-label suffix is configured", () => {
    process.env.TURSO_DB_DOMAIN_SUFFIX = "db.memories.sh"

    expect(buildLibsqlUrlFromHostname("demo.turso.io")).toBe("libsql://demo.db.memories.sh")
    expect(applyTursoDomainAlias("libsql://tenant-a.turso.io")).toBe(
      "libsql://tenant-a.db.memories.sh"
    )
  })

  it("keeps non-turso domains unchanged", () => {
    process.env.TURSO_DB_DOMAIN_SUFFIX = "db.memories.sh"

    expect(buildLibsqlUrlFromHostname("example.internal")).toBe("libsql://example.internal")
    expect(applyTursoDomainAlias("libsql://custom.db.memories.sh")).toBe(
      "libsql://custom.db.memories.sh"
    )
  })
})
