import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type RankingWindow, type TeamRanking, type TeamRankingsResponse } from '../api'

interface Column {
  stat: string   // field in TeamRanking; its rank is `${stat}_rank`
  label: string
  title: string  // full name, shown on hover
  pct?: boolean
}

const VIEWS: { id: string; label: string; columns: Column[] }[] = [
  {
    id: 'overview', label: 'Overview', columns: [
      { stat: 'net_rating', label: 'NET', title: 'Net rating (points per 100 possessions, scored minus allowed)' },
      { stat: 'off_rating', label: 'ORTG', title: 'Offensive rating (points scored per 100 possessions)' },
      { stat: 'def_rating', label: 'DRTG', title: 'Defensive rating (points allowed per 100 possessions)' },
      { stat: 'pace', label: 'PACE', title: 'Possessions per game' },
      { stat: 'reb_pct', label: 'REB%', title: 'Share of all available rebounds', pct: true },
    ],
  },
  {
    id: 'offence', label: 'Offence', columns: [
      { stat: 'pts', label: 'PTS', title: 'Points per game' },
      { stat: 'fg_pct', label: 'FG%', title: 'Field goal %', pct: true },
      { stat: 'tpm', label: '3PM', title: '3 pointers made per game' },
      { stat: 'tp_pct', label: '3P%', title: '3 point %', pct: true },
      { stat: 'reb', label: 'REB', title: 'Rebounds per game' },
      { stat: 'oreb', label: 'OREB', title: 'Offensive rebounds per game' },
      { stat: 'ast', label: 'AST', title: 'Assists per game' },
    ],
  },
  {
    id: 'defence', label: 'Defence', columns: [
      { stat: 'opp_pts', label: 'PTS', title: 'Points allowed per game' },
      { stat: 'opp_fg_pct', label: 'FG%', title: 'Opponent field goal %', pct: true },
      { stat: 'opp_tpm', label: '3PM', title: '3 pointers allowed per game' },
      { stat: 'opp_tp_pct', label: '3P%', title: 'Opponent 3 point %', pct: true },
      { stat: 'opp_reb', label: 'REB', title: 'Rebounds allowed per game' },
      { stat: 'opp_ast', label: 'AST', title: 'Assists allowed per game' },
      { stat: 'def_rating', label: 'DRTG', title: 'Defensive rating (points allowed per 100 possessions)' },
    ],
  },
]

const WINDOWS: { id: RankingWindow; label: string }[] = [
  { id: 'blended', label: 'Blended' },
  { id: 'season', label: 'Season' },
  { id: 'last10', label: 'Last 10' },
]

function seasonLabel(season: number): string {
  return `${season}-${String(season + 1).slice(2)}`
}

export default function RankingsPage() {
  // null = the current season, whatever the backend says that is
  const [season, setSeason] = useState<number | null>(null)
  const [win, setWin] = useState<RankingWindow>('blended')
  const [view, setView] = useState(VIEWS[0].id)
  const [sortStat, setSortStat] = useState('net_rating')
  const [data, setData] = useState<TeamRankingsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: number | null, w: RankingWindow) => {
    setLoading(true)
    try {
      const resp = await api.teamRankings(s, w)
      setData(resp)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(season, win) }, [load, season, win])

  const current = data?.seasons[0]
  const shownSeason = season ?? current
  // Blending only applies to the current season; last season has nothing older to lean on
  const windows = shownSeason !== current ? WINDOWS.filter(w => w.id !== 'blended') : WINDOWS
  const columns = VIEWS.find(v => v.id === view)!.columns

  const chooseSeason = (s: number) => {
    if (s !== current && win === 'blended') setWin('season')
    setSeason(s)
  }
  const chooseView = (id: string) => {
    setView(id)
    setSortStat(VIEWS.find(v => v.id === id)!.columns[0].stat)
  }

  const teams = useMemo(() => {
    const rows = [...(data?.teams ?? [])]
    return rows.sort((a, b) => rankOf(a, sortStat) - rankOf(b, sortStat) || a.code.localeCompare(b.code))
  }, [data, sortStat])

  return (
    <section className="page">
      <header className="page-head">
        <h1>Team Rankings</h1>
        {data && (
          <div className="seg" role="group" aria-label="Season">
            {data.seasons.map(s => (
              <button key={s} type="button" className={s === shownSeason ? 'on' : ''} aria-pressed={s === shownSeason}
                onClick={() => chooseSeason(s)}>{seasonLabel(s)}</button>
            ))}
          </div>
        )}
      </header>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Stats">
          {VIEWS.map(v => (
            <button key={v.id} type="button" className={v.id === view ? 'on' : ''} aria-pressed={v.id === view}
              onClick={() => chooseView(v.id)}>{v.label}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Games included">
          {windows.map(w => (
            <button key={w.id} type="button" className={w.id === win ? 'on' : ''} aria-pressed={w.id === win}
              onClick={() => setWin(w.id)}>{w.label}</button>
          ))}
        </div>
      </div>

      {data && <WindowNote data={data} />}

      {error && (
        <div className="notice error" role="alert">
          Could not load rankings: {error}
          <button type="button" className="link" onClick={() => load(season, win)}>Try again</button>
        </div>
      )}

      {loading && !data ? (
        <div className="table-wrap skeleton" aria-busy="true" style={{ height: 480 }} />
      ) : data && data.teams.length === 0 ? (
        <div className="notice">No regular season games played yet in {seasonLabel(data.season)}.</div>
      ) : (
        <div className={`table-wrap${loading ? ' dim' : ''}`}>
          <table className="rank-table">
            <thead>
              <tr>
                <th scope="col" className="team-col">Team</th>
                <th scope="col" className="num">W-L</th>
                {columns.map(c => (
                  <th key={c.stat} scope="col" className="num" title={c.title}
                    aria-sort={sortStat === c.stat ? 'ascending' : undefined}>
                    <button type="button" className={sortStat === c.stat ? 'sorted' : ''} onClick={() => setSortStat(c.stat)}>
                      {c.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t, i) => (
                <tr key={t.team_id}>
                  <th scope="row" className="team-col">
                    <span className="row-num">{i + 1}</span>
                    {t.logo_url
                      ? <img src={t.logo_url} alt="" width={22} height={22} loading="lazy" />
                      : <span className="logo-fallback">{t.code}</span>}
                    <span className="team-code" title={t.name}>{t.code}</span>
                  </th>
                  <td className="num muted">{t.wins}-{t.losses}</td>
                  {columns.map(c => <StatCell key={c.stat} team={t} column={c} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="footnote">
        Regular season games only. Rank 1 is best: most for offence, fewest allowed for defence.
        Click a column to sort by it.
      </p>
    </section>
  )
}

function rankOf(t: TeamRanking, stat: string): number {
  const r = t[`${stat}_rank`]
  return typeof r === 'number' ? r : 99
}

function StatCell({ team, column }: { team: TeamRanking; column: Column }) {
  const value = team[column.stat]
  const rank = rankOf(team, column.stat)
  const tier = rank <= 10 ? 'good' : rank >= 21 ? 'bad' : ''
  const shown = typeof value === 'number'
    ? (column.stat === 'net_rating' && value > 0 ? '+' : '') + value.toFixed(1) + (column.pct ? '%' : '')
    : '–'
  return (
    <td className="num">
      <span className="stat-value">{shown}</span>
      <span className={`rank ${tier}`}>{rank === 99 ? '' : rank}</span>
    </td>
  )
}

function WindowNote({ data }: { data: TeamRankingsResponse }) {
  const teams = data.teams
  if (teams.length === 0) return null
  const avgGames = Math.round(teams.reduce((n, t) => n + t.games, 0) / teams.length)
  const thisSeason = seasonLabel(data.season)
  if (data.window === 'blended') {
    const share = Math.round(teams.reduce((n, t) => n + t.current_share, 0) / teams.length)
    return (
      <p className="window-note">
        {thisSeason} games (about {avgGames} per team) plus {seasonLabel(data.season - 1)} counted
        as {data.prior_games} games. This season makes up about <strong>{share}%</strong> of the numbers,
        rising as more games are played.
      </p>
    )
  }
  if (data.window === 'last10') {
    return <p className="window-note">Each team's last {Math.min(10, avgGames)} {thisSeason} regular season games.</p>
  }
  return <p className="window-note">Every {thisSeason} regular season game (about {avgGames} per team).</p>
}
