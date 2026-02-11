import type {
  ManagementKeyCreateInput,
  ManagementKeyCreateResult,
  ManagementKeyRevokeResult,
  ManagementKeyStatus,
  ManagementTenantDisableResult,
  ManagementTenantListResult,
  ManagementTenantUpsertInput,
  ManagementTenantUpsertResult,
} from "@memories.sh/core"
import { resolveClient } from "./client"
import type { MemoriesBaseOptions, MemoriesManagement } from "./types"

export function managementKeys(options: MemoriesBaseOptions = {}): MemoriesManagement["keys"] {
  const client = resolveClient(options, { requireTenant: false })

  return {
    get: async (): Promise<ManagementKeyStatus> => client.management.keys.get(),
    create: async (input: ManagementKeyCreateInput): Promise<ManagementKeyCreateResult> =>
      client.management.keys.create(input),
    revoke: async (): Promise<ManagementKeyRevokeResult> => client.management.keys.revoke(),
  }
}

export function managementTenants(options: MemoriesBaseOptions = {}): MemoriesManagement["tenants"] {
  const client = resolveClient(options, { requireTenant: false })

  return {
    list: async (): Promise<ManagementTenantListResult> => client.management.tenants.list(),
    upsert: async (input: ManagementTenantUpsertInput): Promise<ManagementTenantUpsertResult> =>
      client.management.tenants.upsert(input),
    disable: async (tenantId: string): Promise<ManagementTenantDisableResult> =>
      client.management.tenants.disable(tenantId),
  }
}

export function memoriesManagement(options: MemoriesBaseOptions = {}): MemoriesManagement {
  return {
    keys: managementKeys(options),
    tenants: managementTenants(options),
  }
}
