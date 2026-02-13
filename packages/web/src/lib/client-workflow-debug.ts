export interface ClientWorkflowEvent {
  id: string
  workflow: string
  phase: "start" | "success" | "failure"
  ts: string
  durationMs?: number
  message?: string
  details?: Record<string, unknown>
}

export const CLIENT_WORKFLOW_EVENT_NAME = "memories:workflow-event"
const STORAGE_KEY = "memories:workflow-events"
const MAX_EVENTS = 60

function readFromStorage(): ClientWorkflowEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ClientWorkflowEvent[]) : []
  } catch {
    return []
  }
}

function writeToStorage(events: ClientWorkflowEvent[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
  } catch {
    // Best-effort only.
  }
}

export function listClientWorkflowEvents(): ClientWorkflowEvent[] {
  return readFromStorage()
}

export function clearClientWorkflowEvents(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort only.
  }
}

export function recordClientWorkflowEvent(event: Omit<ClientWorkflowEvent, "id" | "ts">): void {
  if (typeof window === "undefined") return

  const nextEvent: ClientWorkflowEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ts: new Date().toISOString(),
    ...event,
  }

  const events = readFromStorage()
  events.push(nextEvent)
  writeToStorage(events)

  window.dispatchEvent(
    new CustomEvent<ClientWorkflowEvent>(CLIENT_WORKFLOW_EVENT_NAME, {
      detail: nextEvent,
    }),
  )
}
