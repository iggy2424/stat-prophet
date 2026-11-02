import { useState } from 'react'
import GamesPage from './pages/GamesPage'

// Pages get added here as they are rebuilt. Disabled entries are not built yet.
const PAGES = [
  { id: 'games', label: 'Games', ready: true },
  { id: 'picks', label: 'Picks', ready: false },
  { id: 'analyzer', label: 'Prop Analyzer', ready: false },
  { id: 'datalab', label: 'DataLab', ready: false },
  { id: 'betslip', label: 'Bet Slip', ready: false },
  { id: 'history', label: 'Pick History', ready: false },
] as const

type PageId = (typeof PAGES)[number]['id']

export default function App() {
  const [page, setPage] = useState<PageId>('games')

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <img src="/TB_logo_transparent.png" alt="" width={28} height={28} />
          <span>TrendBet</span>
        </div>
        <ul>
          {PAGES.map(p => (
            <li key={p.id}>
              <button
                type="button"
                className={page === p.id ? 'active' : ''}
                aria-current={page === p.id ? 'page' : undefined}
                disabled={!p.ready}
                onClick={() => setPage(p.id)}
              >
                {p.label}
                {!p.ready && <span className="soon">soon</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="content">
        {page === 'games' && <GamesPage />}
      </main>
    </div>
  )
}
