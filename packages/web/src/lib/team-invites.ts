export const TEAM_INVITE_TTL_HOURS = 24

const ONE_HOUR_MS = 60 * 60 * 1000

export function getTeamInviteExpiresAt(now = Date.now()): string {
  return new Date(now + TEAM_INVITE_TTL_HOURS * ONE_HOUR_MS).toISOString()
}

export function getTeamInviteExpiryLabel(): string {
  return `${TEAM_INVITE_TTL_HOURS} hours`
}
