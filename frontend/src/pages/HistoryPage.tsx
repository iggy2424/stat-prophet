import { useCallback, useEffect, useState } from 'react'
import { api, type CalendarDay, type GamesResponse, type ModelCalendarResponse, type ModelGrade } from '../api'
import { dayLabel } from '../dates'
import { GameCard } from './GamesPage'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Grid cells for a month, Monday first: null pads the first and last weeks
function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const pad = (first.getUTCDay() + 6) % 7
  const cells: (string | null)[] = Array(pad).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
}

function pct(g: ModelGrade): string {
  return g.games ? `${Math.round((g.winners_right ?? 0) / g.games * 100)}%` : ''
}

export default function HistoryPage() {
  const [month, setMonth] = useState<string | null>(null)
  const [cal, setCal] = useState<ModelCalendarResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const loadMonth = useCallback(async (target: string | null) => {
    try {
      const resp = await api.modelCalendar(target ?? undefined)
      setCal(resp)
      setMonth(resp.month)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { loadMonth(null) }, [loadMonth])

  const byDate = new Map((cal?.days ?? []).map(d => [d.date, d]))
  const canGoBack = !!(cal && month && cal.first_month && month > cal.first_month)
  const canGoForward = !!(cal && month && month < cal.today.slice(0, 7))

  return (
    <section className="page">
      <header className="page-head">
        <h1>Games History</h1>
        {month && (
          <div className="day-nav" role="group" aria-label="Choose month">
            <button type="button" onClick={() => { setSelected(null); loadMonth(shiftMonth(month, -1)) }}
              disabled={!canGoBack} aria-label="Previous month">‹</button>
            <span className="day-nav-label">{monthLabel(month)}</span>
            <button type="button" onClick={() => { setSelected(null); loadMonth(shiftMonth(month, 1)) }}
              disabled={!canGoForward} aria-label="Next month">›</button>
          </div>
        )}
      </header>

      {error && (
        <div className="notice error" role="alert">
          Could not load the history: {error}
          <button type="button" className="link" onClick={() => loadMonth(month)}>Try again</button>
        </div>
      )}

      {cal && cal.record.games > 0 && (
        <p className="window-note">
          {monthLabel(cal.month)}: <strong>{cal.record.winners_right}-{cal.record.winners_wrong}</strong> picking
          winners ({pct(cal.record)}) over {cal.record.games} games. Margin off by {cal.record.margin_miss} points
          on average, total off by {cal.record.total_miss}.
        </p>
      )}

      {!cal && !error ? (
        <div className="calendar skeleton" aria-busy="true" />
      ) : cal && (
        <div className="calendar" role="grid" aria-label={`Model record, ${monthLabel(cal.month)}`}>
          {WEEKDAYS.map(w => <div key={w} className="cal-head" role="columnheader">{w}</div>)}
          {monthCells(cal.month).map((d, i) => d === null
            ? <div key={`pad-${i}`} className="cal-cell pad" />
            : <DayCell key={d} date={d} day={byDate.get(d)} today={cal.today}
                selected={selected === d} onPick={() => setSelected(selected === d ? null : d)} />)}
        </div>
      )}
      <p className="footnote">✓–✗ = the model's favourite won or lost. Days with games the model did not predict show the game count only.</p>

      {selected && cal && <DayGames date={selected} today={cal.today} grade={byDate.get(selected)} />}
    </section>
  )
}

function DayCell({ date, day, today, selected, onPick }: {
  date: string; day: CalendarDay | undefined; today: string; selected: boolean; onPick: () => void
}) {
  const n = Number(date.slice(8))
  const graded = day && day.games > 0
  const right = day?.winners_right ?? 0
  const wrong = day?.winners_wrong ?? 0
  const tone = !graded ? '' : right > wrong ? ' good' : right < wrong ? ' bad' : ' even'
  if (!day) {
    return <div className={`cal-cell empty${date === today ? ' today' : ''}`}><span className="cal-date">{n}</span></div>
  }
  return (
    <button type="button" role="gridcell" aria-selected={selected}
      className={`cal-cell${tone}${selected ? ' selected' : ''}${date === today ? ' today' : ''}`}
      onClick={onPick}
      aria-label={`${date}: ${day.played} games${graded ? `, ${right} right, ${wrong} wrong` : ''}`}>
      <span className="cal-date">{n}</span>
      {graded
        ? <span className="cal-score"><span className="r">{right}</span>–<span className="w">{wrong}</span></span>
        : <span className="cal-games">{day.played}<span className="cal-word"> {day.played === 1 ? 'game' : 'games'}</span></span>}
    </button>
  )
}

function DayGames({ date, today, grade }: { date: string; today: string; grade: CalendarDay | undefined }) {
  const [data, setData] = useState<GamesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setData(null)
    setError(null)
    api.games(date).then(r => { if (live) setData(r) })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)) })
    return () => { live = false }
  }, [date])

  return (
    <div className="day-games">
      <h2>{dayLabel(date, today)}</h2>
      {grade && grade.games > 0 && (
        <p className="window-note">
          <strong>{grade.winners_right}-{grade.winners_wrong}</strong> picking winners ({pct(grade)}).
          Margin off by {grade.margin_miss} points on average, total off by {grade.total_miss}.
        </p>
      )}
      {error && <div className="notice error" role="alert">Could not load games: {error}</div>}
      {!data && !error ? (
        <div className="game-list" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="game-card skeleton" />)}
        </div>
      ) : data && (
        <div className="game-list">{data.games.map(g => <GameCard key={g.id} game={g} />)}</div>
      )}
    </div>
  )
}
