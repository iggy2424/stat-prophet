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
  prediction: GamePrediction | null
  injuries?: Injury[]  // only for today and later; most minutes first
}

export interface Injury {
  player_id: number
  player_name: string
  team_id: number
  status: string               // Out, Doubtful, Questionable, Probable, Day-To-Day or Available
  return_date: string | null
  description: string | null
  updated_at: string
  minutes: number | null       // average over the player's last 10 games
  points: number | null
}

// Made before tip off by the predictions job; numbers arrive from Postgres as strings or numbers
export interface GamePrediction {
  model: string
  home_points: number | string
  away_points: number | string
  home_win_prob: number | string
}

export interface ModelGrade {
  games: number
  winners_right?: number
  winners_wrong?: number
  margin_miss?: number
  total_miss?: number
  total_bias?: number
}

export interface ModelRecordResponse {
  model: string
  all: ModelGrade
  last_7_days: ModelGrade
}

export interface GamesResponse {
  date: string
  today: string
  games: Game[]
  scores_refreshed: boolean
}

export type RankingWindow = 'blended' | 'season' | 'last10'

// One team in team_rankings. Every stat has a matching <stat>_rank (1 = best).
export interface TeamRanking {
  team_id: number
  code: string
  name: string
  logo_url: string | null
  games: number
  wins: number
  losses: number
  current_share: number
  [stat: string]: number | string | null
}

export interface TeamRankingsResponse {
  season: number
  window: RankingWindow
  seasons: number[]
  prior_games: number
  teams: TeamRanking[]
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
  teamRankings: (season: number | null, window: RankingWindow) =>
    get<TeamRankingsResponse>('team_rankings', season ? { season: String(season), window } : { window }),
  modelRecord: () => get<ModelRecordResponse>('model_record'),
}
