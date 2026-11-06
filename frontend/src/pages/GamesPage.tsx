import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Game, type GamesResponse, type ModelGrade } from '../api'
import { dayLabel, shiftDay, tipOffET } from '../dates'

// The backend refreshes when its last live run is over 10s old, so every 15s poll gets fresh data
const LIVE_REFRESH_MS = 15_000

export default function GamesPage() {
  const [day, setDay] = useState<string | null>(null)
  const [data, setData] = useState<GamesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (target: string | null, quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const resp = await api.games(target ?? undefined)
      setData(resp)
      setDay(resp.date)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(null) }, [load])

  // The model's record is a side panel: if it fails, the games still show
  const [record, setRecord] = useState<ModelGrade | null>(null)
  useEffect(() => {
    api.modelRecord().then(r => setRecord(r.all)).catch(() => setRecord(null))
  }, [])

  // Keep scores fresh while any game on screen is live or due to start
  const hasActive = data?.games.some(g => g.status === 'live' ||
    (g.status === 'scheduled' && new Date(g.start_time) <= new Date()))
  useEffect(() => {
    if (!hasActive || !day) return
    // Skip refreshes while the tab is hidden, and catch up as soon as it is visible again
    const tick = () => { if (document.visibilityState === 'visible') load(day, true) }
    const t = setInterval(tick, LIVE_REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick) }
  }, [hasActive, day, load])

  const today = data?.today ?? day ?? ''

  return (
    <section className="page">
      <header className="page-head">
        <h1>Games</h1>
        {day && (
          <div className="day-nav" role="group" aria-label="Choose day">
            <button type="button" onClick={() => load(shiftDay(day, -1))} aria-label="Previous day">‹</button>
            <span className="day-nav-label">{dayLabel(day, today)}</span>
            <button type="button" onClick={() => load(shiftDay(day, 1))} aria-label="Next day">›</button>
            {day !== today && <button type="button" className="link" onClick={() => load(today)}>Today</button>}
          </div>
        )}
      </header>

      {record && record.games > 0 && (
        <p className="window-note">
          Model record: <strong>{record.winners_right}-{record.winners_wrong}</strong> picking winners
          ({Math.round((record.winners_right ?? 0) / record.games * 100)}%) over {record.games} games.
          Margin off by {record.margin_miss} points on average, total off by {record.total_miss}.
        </p>
      )}

      {error && (
        <div className="notice error" role="alert">
          Could not load games: {error}
          <button type="button" className="link" onClick={() => load(day)}>Try again</button>
        </div>
      )}

      {loading && !data ? (
        <div className="game-list" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="game-card skeleton" />)}
        </div>
      ) : data && data.games.length === 0 ? (
        <div className="notice">No NBA games {emptyLabel(dayLabel(data.date, today))}.</div>
      ) : (
        <div className={`game-list${loading ? ' dim' : ''}`}>
          {data?.games.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}
    </section>
  )
}

function emptyLabel(label: string): string {
  return ['Today', 'Tomorrow', 'Yesterday'].includes(label) ? label.toLowerCase() : `on ${label}`
}

function GameCard({ game: g }: { game: Game }) {
  const showScore = g.status === 'live' || g.status === 'finished'
  const awayWon = g.status === 'finished' && (g.away_score ?? 0) > (g.home_score ?? 0)
  const homeWon = g.status === 'finished' && (g.home_score ?? 0) > (g.away_score ?? 0)

  return (
    <article className={`game-card status-${g.status}`}>
      <div className="game-teams">
        <TeamRow team={g.away} score={showScore ? g.away_score : null} won={awayWon} />
        <TeamRow team={g.home} score={showScore ? g.home_score : null} won={homeWon} />
      </div>
      <div className="game-meta">
        {g.status === 'live' && <span className="badge live">{g.status_detail || 'Live'}</span>}
        {g.status === 'finished' && <span className="badge">Final</span>}
        {g.status === 'scheduled' && <span>{tipOffET(g.start_time)}</span>}
        {g.status === 'postponed' && <span className="badge">Postponed</span>}
        {g.status === 'canceled' && <span className="badge">Canceled</span>}
        {g.stage === 1 && <span className="tag">Preseason</span>}
      </div>
      {g.prediction && <PredictionLine game={g} />}
      {g.status !== 'finished' && g.injuries && g.injuries.length > 0 && <InjuryList game={g} />}
    </article>
  )
}

function PredictionLine({ game: g }: { game: Game }) {
  const p = g.prediction!
  const home = Math.round(Number(p.home_points))
  const away = Math.round(Number(p.away_points))
  const homeProb = Number(p.home_win_prob)
  const homeFav = homeProb >= 0.5
  const fav = homeFav ? g.home.code : g.away.code
  const prob = Math.round((homeFav ? homeProb : 1 - homeProb) * 100)
  // Graded once the game is final: did the favourite win?
  let result: 'right' | 'wrong' | null = null
  if (g.status === 'finished' && g.home_score !== null && g.away_score !== null) {
    result = (g.home_score > g.away_score) === homeFav ? 'right' : 'wrong'
  }
  return (
    <p className="prediction">
      <span className="prediction-label">Model</span>
      {g.away.code} {away} – {g.home.code} {home} · total {home + away} · {fav} {prob}%
      {result && <span className={`prediction-result ${result}`}>{result === 'right' ? '✓' : '✗'}</span>}
    </p>
  )
}

// Players under this many minutes a game are counted, not named, to keep the card short
const NAMED_MINUTES = 10

// BallDontLie status -> short label. Out and Doubtful are shown in red.
const INJURY_LABELS: Record<string, string> = {
  'Out': 'OUT', 'Doubtful': 'DOUBTFUL', 'Questionable': 'QUESTIONABLE', 'Probable': 'PROBABLE', 'Day-To-Day': 'DTD',
}
const LIKELY_OUT = new Set(['Out', 'Doubtful'])

function InjuryList({ game: g }: { game: Game }) {
  return (
    <div className="injuries">
      {[g.away, g.home].map(team => {
        // 'Available' means cleared to play: nothing to show
        const players = g.injuries!.filter(p => p.team_id === team.id && p.status !== 'Available')
        if (players.length === 0) return null
        const named = players.filter(p => (p.minutes ?? 0) >= NAMED_MINUTES)
        const others = players.length - named.length
        return (
          <p key={team.id} className="injury-team">
            <span className="injury-code">{team.code}</span>
            {named.map(p => (
              <span key={p.player_id} className={`injury ${LIKELY_OUT.has(p.status) ? 'out' : 'dtd'}`}
                title={p.description ?? undefined}>
                {p.player_name} <small>{INJURY_LABELS[p.status] ?? p.status.toUpperCase()} · {Math.round(p.minutes!)} min</small>
              </span>
            ))}
            {others > 0 && <span className="injury-more">{named.length ? `+${others} bench` : `${others} bench players`}</span>}
          </p>
        )
      })}
    </div>
  )
}

function TeamRow({ team, score, won }: { team: Game['home']; score: number | null; won: boolean }) {
  // Flash the score briefly when it changes during a live game
  const previous = useRef(score)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (previous.current !== null && score !== null && score !== previous.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 1200)
      previous.current = score
      return () => clearTimeout(t)
    }
    previous.current = score
  }, [score])

  return (
    <div className={`team-row${won ? ' won' : ''}`}>
      {team.logo_url
        ? <img src={team.logo_url} alt="" width={28} height={28} loading="lazy" />
        : <span className="logo-fallback">{team.code}</span>}
      <span className="team-name">{team.name}</span>
      {score !== null && <span className={`team-score${flash ? ' flash' : ''}`}>{score}</span>}
    </div>
  )
}
