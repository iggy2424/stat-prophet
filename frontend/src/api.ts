// Typed access to /api?type=...  A 401 sends the user to the login page.

export interface Team {
  id: number
  name: string
  nickname: string
  code: string
  logo_url: string | null
}

export type GameStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'canceled'

export interface Game {
  id: number
  season: number
  stage: number | null
  start_time: string
  game_date_et: string
  status: GameStatus
  status_detail: string | null
  home_score: number | null
  away_score: number | null
  home: Team
  away: Team
}

export interface GamesResponse {
  date: string
  today: string
  games: Game[]
  scores_refreshed: boolean
}

export class ApiError extends Error {}

async function get<T>(type: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ type, ...params })
  const resp = await fetch(`/api?${qs}`, { credentials: 'same-origin' })
  if (resp.status === 401) {
    window.location.href = '/login'
    throw new ApiError('Signed out')
  }
  const body = await resp.json().catch(() => null)
  if (!resp.ok) throw new ApiError(body?.error || `Request failed (${resp.status})`)
  return body as T
}

export const api = {
  games: (date?: string) => get<GamesResponse>('games', date ? { date } : {}),
}
