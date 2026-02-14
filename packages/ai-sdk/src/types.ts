import type {
  BulkForgetFilter,
  BulkForgetResult,
  ContextGetInput,
  ContextMode,
  ContextStrategy,
  ContextResult,
  ManagementKeyCreateInput,
  ManagementKeyCreateResult,
  ManagementKeyRevokeResult,
  ManagementKeyStatus,
  ManagementTenantDisableResult,
  ManagementTenantListResult,
  ManagementTenantUpsertInput,
  ManagementTenantUpsertResult,
  MemoriesClient,
  MemoriesClientOptions,
  MemoryAddInput,
  SkillFileDeleteInput,
  SkillFileListOptions,
  SkillFileRecord,
  SkillFileUpsertInput,
  MemoryEditInput,
  MemoryListOptions,
  MemoryRecord,
  MemorySearchOptions,
  MutationResult,
  VacuumResult,
} from "@memories.sh/core"

export interface MemoriesBaseOptions extends Omit<MemoriesClientOptions, "userId"> {
  client?: MemoriesClient
  userId?: string
  projectId?: string
}

export interface MemoriesMiddlewareOptions extends MemoriesBaseOptions {
  limit?: number
  includeRules?: boolean
  mode?: ContextMode
  strategy?: ContextStrategy
  graphDepth?: 0 | 1 | 2
  graphLimit?: number
  extractQuery?: (params: unknown) => string | undefined
  preloaded?: ContextResult
}

export interface MemoriesSystemPromptOptions {
  includeInstructions?: boolean
  persona?: string
  rules?: Array<Pick<MemoryRecord, "content"> | string>
}

export interface CreateMemoriesOnFinishOptions extends MemoriesBaseOptions {
  mode?: "tool-calls-only" | "auto-extract"
  extractMemories?: (payload: unknown) => MemoryAddInput[]
}

export interface MemoriesTools {
  getContext: (input?: ContextGetInput) => Promise<ContextResult>
  storeMemory: (input: MemoryAddInput) => Promise<MutationResult>
  searchMemories: (input: { query: string } & MemorySearchOptions) => Promise<MemoryRecord[]>
  listMemories: (input?: MemoryListOptions) => Promise<MemoryRecord[]>
  forgetMemory: (input: { id: string }) => Promise<MutationResult>
  editMemory: (input: { id: string; updates: MemoryEditInput }) => Promise<MutationResult>
  upsertSkillFile: (input: SkillFileUpsertInput) => Promise<MutationResult>
  listSkillFiles: (input?: SkillFileListOptions) => Promise<SkillFileRecord[]>
  deleteSkillFile: (input: SkillFileDeleteInput) => Promise<MutationResult>
  bulkForgetMemories: (input: { filters: BulkForgetFilter; dryRun?: boolean }) => Promise<BulkForgetResult>
  vacuumMemories: () => Promise<VacuumResult>
}

export interface MemoriesManagement {
  keys: {
    get: () => Promise<ManagementKeyStatus>
    create: (input: ManagementKeyCreateInput) => Promise<ManagementKeyCreateResult>
    revoke: () => Promise<ManagementKeyRevokeResult>
  }
  tenants: {
    list: () => Promise<ManagementTenantListResult>
    upsert: (input: ManagementTenantUpsertInput) => Promise<ManagementTenantUpsertResult>
    disable: (tenantId: string) => Promise<ManagementTenantDisableResult>
  }
}
