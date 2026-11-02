import { useEffect, useState } from 'react'
import GamesPage from './pages/GamesPage'
import RankingsPage from './pages/RankingsPage'

// Pages get added here as they are rebuilt. Disabled entries are not built yet.
const PAGES = [
  { id: 'games', label: 'Games', ready: true },
  { id: 'rankings', label: 'Team Rankings', ready: true },
  { id: 'picks', label: 'Picks', ready: false },
  { id: 'analyzer', label: 'Prop Analyzer', ready: false },
  { id: 'datalab', label: 'DataLab', ready: false },
  { id: 'betslip', label: 'Bet Slip', ready: false },
  { id: 'history', label: 'Pick History', ready: false },
] as const

type PageId = (typeof PAGES)[number]['id']

// The page lives in the URL hash (#rankings) so refreshing or sharing a link keeps it
function pageFromHash(): PageId {
  const id = window.location.hash.slice(1)
  return PAGES.find(p => p.id === id && p.ready)?.id ?? 'games'
}

export default function App() {
  const [page, setPage] = useState<PageId>(pageFromHash)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

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
                onClick={() => { window.location.hash = p.id }}
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
        {page === 'rankings' && <RankingsPage />}
      </main>
    </div>
  )
}
