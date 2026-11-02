// Dates are US Eastern calendar days ("YYYY-MM-DD"), matching games.game_date_et.

export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today'
  if (day === shiftDay(today, 1)) return 'Tomorrow'
  if (day === shiftDay(today, -1)) return 'Yesterday'
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

export function tipOffET(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET'
}
