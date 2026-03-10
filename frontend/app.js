const API_URL = 'https://stat-prophet.vercel.app/api';

// Auth check — redirect to login if session invalid
(async () => {
  try {
    const res = await fetch(`${API_URL}?type=ping`);
    if (res.status === 401) {
      window.location.href = '/login';
    }
  } catch (e) {
    // network error — let the app continue
  }
})();


const statCategoriesBySport = {
  NBA: ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks'],
  NFL: ['Passing Yards', 'Passing TDs', 'Rushing Yards', 'Receiving Yards', 'Receptions', 'Touchdowns'],
  MLB: ['Hits', 'Strikeouts', 'Home Runs', 'RBIs', 'Total Bases', 'Walks']
};

const sportEmojis = { NBA: '🏀', NFL: '🏈', MLB: '⚾' };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @keyframes tbPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    @keyframes tbSpin  { to { transform: rotate(360deg); } }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #1a1d23; }
    ::-webkit-scrollbar { height: 4px; width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
    select option { background: #1a1d23; color: #fff; }
    .game-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .game-scroll::-webkit-scrollbar { display: none; }
    .scroll-arrow { transition: opacity 0.2s, background 0.2s; }
    .scroll-arrow:hover { opacity: 1 !important; }
  `}</style>
);

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ currentPage, setCurrentPage, isMobile, sidebarOpen, setSidebarOpen }) {
  const navSections = [
    {
      section: 'HOME',
      items: [{ id: 'home', label: 'Dashboard', icon: '▣' }]
    },
    {
      section: 'PREDICTIONS',
      items: [
        { id: 'ai-picks',    label: 'AI Picks',       icon: '◈' },
        { id: 'parlay-page', label: 'Parlay Builder',  icon: '◉', soon: true }
      ]
    },
    {
      section: 'ANALYSIS',
      items: [
        { id: 'analyzer',   label: 'Prop Analyzer', icon: '◎' },
        { id: 'datalab',    label: 'Data Lab',       icon: '▤', soon: true },
        { id: 'arbitrage',  label: 'Arbitrage',      icon: '⊕', soon: true }
      ]
    },
    {
      section: 'ASSISTANT',
      items: [
        { id: 'bet-validate', label: 'Validate Bet Slip', icon: '⬡' },
        { id: 'gpt',          label: 'TrendBetGPT',       icon: '⊛', testing: true },
      ]
    }
  ];

  const navigate = (id) => {
    setCurrentPage(id);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
        background: '#1a1d23',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        zIndex: 1001,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-220px)') : 'translateX(0)',
        transition: 'transform 0.28s ease'
      }}>

        {/* Logo */}
        <div
          onClick={() => navigate('home')}
          style={{ padding: '18px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}
        >
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #33cc33, #00cc6a)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏀</div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: '#fff' }}>TRENDBET</span>
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {navSections.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: '4px' }}>
              {/* Section label — subtle but visible */}
              <div style={{ padding: '10px 18px 4px', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '2px', color: '#44445e', textTransform: 'uppercase' }}>
                {section}
              </div>
              {items.map(item => {
                const isActive = currentPage === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.soon && !item.testing && navigate(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 18px',
                      cursor: (item.soon || item.testing) ? 'default' : 'pointer',
                      background: isActive ? 'rgba(51,204,51,0.07)' : 'transparent',
                      borderLeft: isActive ? '2px solid #33cc33' : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={e => { if (!item.soon && !item.testing && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Icon */}
                    <span style={{ fontSize: '12px', color: isActive ? '#33cc33' : ((item.soon || item.testing) ? '#363655' : '#606080'), flexShrink: 0 }}>{item.icon}</span>
                    {/* Label */}
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: (item.soon || item.testing) ? '#4a4a68' : (isActive ? '#33cc33' : '#aaaacc'), flex: 1 }}>{item.label}</span>
                    {/* Soon badge */}
                    {item.soon && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#3a3a55', letterSpacing: '1px', background: 'rgba(255,255,255,0.04)', padding: '2px 5px', borderRadius: '3px' }}>SOON</span>}
                    {/* Testing badge */}
                    {item.testing && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#7a5c00', letterSpacing: '1px', background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.15)', padding: '2px 5px', borderRadius: '3px' }}>TESTING</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Live Data indicator */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#33cc33', boxShadow: '0 0 8px #33cc33', animation: 'tbPulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '2px', color: '#33cc33' }}>LIVE DATA</span>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#44445e', letterSpacing: '1px' }}>API-SPORTS</div>
        </div>
      </div>
    </>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ setCurrentPage, navigateToAnalyzer }) {
  const [games, setGames] = React.useState({ NBA: [], NFL: [], MLB: [] });
  const [gamesLoading, setGamesLoading] = React.useState(true);
  const [activeTabs, setActiveTabs] = React.useState({ NBA: 'upcoming', NFL: 'upcoming', MLB: 'upcoming' });

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}?type=games&sport=ALL`);
        const data = await res.json();
        if (data.success !== false) {
          setGames({ NBA: data.NBA || [], NFL: data.NFL || [], MLB: data.MLB || [] });
        }
      } catch (e) {
        console.error('Failed to fetch games:', e);
      }
      setGamesLoading(false);
    })();
  }, []);

  const formatTime = (scheduled, status) => {
    if (status === 'inprogress' || status === 'halftime') return null;
    if (!scheduled) return 'TBD';
    try {
      const d = new Date(scheduled);
      const now = new Date();
      const todayStr = now.toDateString();
      const tmrStr = new Date(now.getTime() + 86400000).toDateString();
      const dStr = d.toDateString();
      const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      if (dStr === todayStr) return `TODAY  ${t}`;
      if (dStr === tmrStr) return `TOMORROW  ${t}`;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() + `  ${t}`;
    } catch { return 'TBD'; }
  };

  // ── Game Card ──────────────────────────────────────────────────────────────
  const GameCard = ({ game }) => {
    const isLive = game.status === 'inprogress' || game.status === 'halftime';
    const timeLabel = formatTime(game.scheduled, game.status);
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${isLive ? 'rgba(255,68,68,0.3)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: '10px', padding: '16px',
          minWidth: '200px', maxWidth: '200px', flexShrink: 0,
          cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
          userSelect: 'none',
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = 'rgba(51,204,51,0.4)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.045)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = isLive ? 'rgba(255,68,68,0.3)' : 'rgba(255,255,255,0.09)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Live badge */}
        {isLive && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff4444', animation: 'tbPulse 1s infinite' }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#ff5555', letterSpacing: '1px' }}>LIVE</span>
          </div>
        )}

        {/* Time */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#7788aa', letterSpacing: '0.5px', marginBottom: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isLive ? '● IN PROGRESS' : (timeLabel || 'TBD')}
        </div>

        {/* Away team */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
            {game.away.logo && <img src={game.away.logo} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', letterSpacing: '1px', color: '#e8e8f0', lineHeight: 1, flexShrink: 0 }}>
                {game.away.alias || (game.away.name || '').slice(0, 3).toUpperCase()}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#7788aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {game.away.name}
              </span>
            </div>
          </div>
          {game.away.points != null && (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#fff', letterSpacing: '1px', flexShrink: 0 }}>{game.away.points}</span>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555570' }}>@</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Home team */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
            {game.home.logo && <img src={game.home.logo} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', letterSpacing: '1px', color: '#e8e8f0', lineHeight: 1, flexShrink: 0 }}>
                {game.home.alias || (game.home.name || '').slice(0, 3).toUpperCase()}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#7788aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {game.home.name}
              </span>
            </div>
          </div>
          {game.home.points != null && (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#fff', letterSpacing: '1px', flexShrink: 0 }}>{game.home.points}</span>
          )}
        </div>

        <button
          onClick={() => navigateToAnalyzer ? navigateToAnalyzer(game) : setCurrentPage('analyzer')}
          style={{ width: '100%', padding: '7px', background: 'rgba(51,204,51,0.06)', border: '1px solid rgba(51,204,51,0.2)', borderRadius: '5px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#33cc33', transition: 'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(51,204,51,0.14)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(51,204,51,0.06)'; }}
        >
          ANALYSE PROP →
        </button>
      </div>
    );
  };

  // ── Empty State ────────────────────────────────────────────────────────────
  const EmptyState = ({ sport }) => (
    <div style={{ height: '165px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', opacity: 0.2, marginBottom: '10px' }}>{sportEmojis[sport]}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px', letterSpacing: '2px', color: '#555' }}>NO GAMES SCHEDULED</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#44445e', marginTop: '5px' }}>Check back soon</div>
      </div>
    </div>
  );

  // ── Sport Row with scroll arrows ────────────────────────────────────────────
  const SportRow = ({ sport }) => {
    const sportGames = games[sport] || [];
    const scrollRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);

    const checkScroll = React.useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    // Recalculate on games change, resize
    React.useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const timer = setTimeout(checkScroll, 150);
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(timer);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }, [sportGames, checkScroll]);

    const scrollCards = (dir) => {
      scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
    };

    return (
      <div style={{ marginBottom: '40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>{sportEmojis[sport]}</span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', letterSpacing: '3px', color: '#fff', flexShrink: 0 }}>{sport}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)', marginLeft: '4px' }} />
          {/* Scroll counter dots + tab buttons on right */}
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {['UPCOMING', 'RECENT'].map(tab => {
              const isActive = activeTabs[sport] === tab.toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTabs(prev => ({ ...prev, [sport]: tab.toLowerCase() }))}
                  style={{ padding: '4px 10px', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${isActive ? 'rgba(255,255,255,0.14)' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1px', color: isActive ? '#ccc' : '#555', transition: 'all 0.15s' }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {gamesLoading ? (
          <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '28px', height: '28px', border: '2px solid rgba(51,204,51,0.15)', borderTopColor: '#33cc33', borderRadius: '50%', animation: 'tbSpin 1s linear infinite' }} />
          </div>
        ) : sportGames.length === 0 ? (
          <EmptyState sport={sport} />
        ) : (
          /* Scroll container with overlay arrows */
          <div style={{ position: 'relative' }}>

            {/* ← LEFT ARROW */}
            {canScrollLeft && (
              <button
                className="scroll-arrow"
                onClick={() => scrollCards(-1)}
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: '12px',
                  width: '52px', border: 'none', cursor: 'pointer', zIndex: 5,
                  background: 'linear-gradient(to right, #1a1d23 35%, rgba(26,29,35,0.7) 70%, transparent)',
                  display: 'flex', alignItems: 'center', paddingLeft: '6px',
                  color: '#fff', fontSize: '26px', lineHeight: 1, opacity: 0.85,
                  padding: '0 0 12px 6px',
                }}
                aria-label="Scroll left"
              >‹</button>
            )}

            {/* → RIGHT ARROW */}
            {canScrollRight && (
              <button
                className="scroll-arrow"
                onClick={() => scrollCards(1)}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: '12px',
                  width: '52px', border: 'none', cursor: 'pointer', zIndex: 5,
                  background: 'linear-gradient(to left, #1a1d23 35%, rgba(26,29,35,0.7) 70%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px',
                  color: '#fff', fontSize: '26px', lineHeight: 1, opacity: 0.85,
                  padding: '0 6px 12px 0',
                }}
                aria-label="Scroll right"
              >›</button>
            )}

            {/* Scrollable row — no scrollbar shown, arrows instead */}
            <div
              ref={scrollRef}
              className="game-scroll"
              style={{
                display: 'flex', gap: '12px',
                overflowX: 'auto',
                paddingBottom: '12px',
                /* Prevent this scroll from bubbling to the page on mobile */
                overscrollBehaviorX: 'contain',
                WebkitOverflowScrolling: 'touch',
                /* Snap to cards on mobile for smoother swipe */
                scrollSnapType: 'x proximity',
              }}
            >
              {sportGames.map(game => (
                <div key={game.id || (game.scheduled + game.home.alias)} style={{ scrollSnapAlign: 'start' }}>
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>DASHBOARD</h1>
        <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #33cc33, transparent)', marginBottom: '10px' }} />
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#55557a', letterSpacing: '2px', margin: 0 }}>
          UPCOMING GAMES  ·  LIVE SCORES  ·  AI ANALYSIS
        </p>
      </div>

      <SportRow sport="NBA" />
      <SportRow sport="NFL" />
      <SportRow sport="MLB" />
    </div>
  );
}

// ─── COMING SOON ──────────────────────────────────────────────────────────────
function ComingSoon({ title, icon, description }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: '72px', height: '72px', background: 'rgba(51,204,51,0.07)', border: '1px solid rgba(51,204,51,0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '22px' }}>
        {icon}
      </div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px', letterSpacing: '4px', color: '#fff', marginBottom: '10px', textAlign: 'center' }}>{title}</h1>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#555', marginBottom: '24px', textAlign: 'center' }}>{description}</p>
      <div style={{ padding: '10px 28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#33cc33' }}>COMING SOON</span>
      </div>
    </div>
  );
}

// ─── ALT LINES PICKER ────────────────────────────────────────────────────────
function AltLinesPicker({ altLines, line, setLine, setDirection }) {
  const scrollRef = React.useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll best value pill to center
    const bestIdx = altLines.findIndex(al => al.best_value);
    if (bestIdx !== -1) {
      setTimeout(() => {
        const pill = el.children[0]?.children[bestIdx];
        if (pill) {
          const pillCenter = pill.offsetLeft + pill.offsetWidth / 2;
          el.scrollLeft = pillCenter - el.clientWidth / 2;
        }
        checkScroll();
      }, 160);
    } else {
      setTimeout(checkScroll, 150);
    }
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [altLines, checkScroll]);

  const arrowBase = {
    position: 'absolute', top: 0, bottom: 0, width: '38px',
    border: 'none', cursor: 'pointer', zIndex: 5,
    display: 'flex', alignItems: 'center',
    color: '#ccc', fontSize: '24px', lineHeight: 1,
  };

  return (
    <div style={{ position: 'relative' }}>
      {canScrollLeft && (
        <button className="scroll-arrow" onClick={() => scrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
          style={{ ...arrowBase, left: 0, justifyContent: 'flex-start', paddingLeft: '4px',
            background: 'linear-gradient(to right, rgba(13,13,20,0.97) 40%, transparent)' }}>‹</button>
      )}
      {canScrollRight && (
        <button className="scroll-arrow" onClick={() => scrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
          style={{ ...arrowBase, right: 0, justifyContent: 'flex-end', paddingRight: '4px',
            background: 'linear-gradient(to left, rgba(13,13,20,0.97) 40%, transparent)' }}>›</button>
      )}
      <div ref={scrollRef} className="game-scroll" style={{ overflowX: 'auto', paddingTop: '12px', paddingBottom: '4px', width: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
          {altLines.map(al => {
            const isSelected = String(line) === String(al.line);
            const hitPct   = al.hit_rate       != null ? Math.round(al.hit_rate * 100)       : null;
            const edgePct  = al.edge            != null ? Math.round(al.edge * 100)           : null;
            const vsOppPct = al.vs_opp_hit_rate != null ? Math.round(al.vs_opp_hit_rate * 100): null;
            const barColor = al.edge != null
              ? (al.edge > 0.05 ? '#33cc33' : al.edge < -0.05 ? '#ff4444' : '#777')
              : (al.hit_rate != null ? (al.hit_rate > 0.5 ? '#33cc33' : al.hit_rate < 0.5 ? '#ff4444' : '#777') : '#777');
            return (
              <div key={al.line} onClick={() => { setLine(String(al.line)); setDirection('OVER'); }}
                style={{ position: 'relative', minWidth: '76px', cursor: 'pointer',
                  padding: al.best_value || al.highest_safe ? '14px 8px 10px' : '10px 8px 10px',
                  borderRadius: '6px', textAlign: 'center',
                  border: `2px solid ${isSelected ? '#33cc33' : al.highest_safe ? 'rgba(0,150,255,0.55)' : al.best_value ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background: isSelected ? 'rgba(51,204,51,0.08)' : al.highest_safe ? 'rgba(0,150,255,0.06)' : al.best_value ? 'rgba(255,215,0,0.04)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s' }}>
                {al.highest_safe && (
                  <div style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)',
                    background: '#0096ff', color: '#fff', fontFamily: "'Space Mono', monospace",
                    fontSize: '7px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px',
                    whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>★ HIGHEST SAFE BET</div>
                )}
                {al.best_value && (
                  <div style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)',
                    background: '#33cc33', color: '#000', fontFamily: "'Space Mono', monospace",
                    fontSize: '7px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px',
                    whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>★ HIGHEST +EV</div>
                )}
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', lineHeight: 1,
                  color: isSelected ? '#33cc33' : al.highest_safe ? '#0096ff' : al.best_value ? '#ffd700' : '#ccc' }}>{al.line}</div>
                {al.over_odds != null && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', marginTop: '2px',
                    color: isSelected ? '#33cc33' : '#666' }}>
                    {al.over_odds > 0 ? '+' : ''}{al.over_odds}
                  </div>
                )}
                {hitPct != null && (
                  <>
                    <div style={{ marginTop: '6px', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${hitPct}%`, background: barColor, borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', marginTop: '3px',
                      color: barColor === '#777' ? '#555' : barColor }}>{hitPct}% overall</div>
                    {edgePct != null && (
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', marginTop: '1px',
                        color: edgePct > 0 ? '#33cc33' : '#ff4444' }}>{edgePct > 0 ? '+' : ''}{edgePct}%</div>
                    )}
                  </>
                )}
                {vsOppPct != null && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', marginTop: '3px',
                    color: '#ffd700', borderTop: '1px solid rgba(255,215,0,0.15)', paddingTop: '3px' }}>
                    {vsOppPct}% vs opp
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PARLAY VALIDATION RESULT PANEL ──────────────────────────────────────────
function ValidationResultPanel({ result, onBack, isMobile }) {
  const noTeams = !result.success || !result.teams || result.teams.length === 0;

  return (
    <div style={{ padding: isMobile ? '16px' : '20px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', color: '#888', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', padding: '6px 12px', cursor: 'pointer', marginBottom: '20px' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
      >← BACK TO PICKS</button>

      {noTeams ? (
        <div style={{ textAlign: 'center', padding: '20px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' }}>
          {result.error || 'Not enough picks from the same team to validate'}
        </div>
      ) : (
        result.teams.map(team => {
          const scoreColor = team.all_hit_count >= Math.ceil(team.total_games * 0.6)
            ? '#33cc33' : team.all_hit_count >= Math.ceil(team.total_games * 0.4) ? '#ffd700' : '#ff4444';

          return (
            <div key={team.team_abbrev} style={{ marginBottom: '28px' }}>
              {/* Team header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: '#fff', letterSpacing: '2px' }}>
                  {team.team_name}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: scoreColor, background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`, borderRadius: '4px', padding: '3px 10px', letterSpacing: '1px' }}>
                  ALL HIT {team.all_hit_count}/{team.total_games}
                </div>
              </div>

              {team.game_rows.length === 0 ? (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', padding: '12px 0' }}>No shared games found</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  {/* Column headers */}
                  {(() => {
                    const colCount = team.game_rows[0].players.length;
                    const gridCols = `${Array(colCount).fill('1fr').join(' ')} 60px`;
                    return (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '8px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {team.game_rows[0].players.map(p => (
                            <span key={p.name} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#888', textAlign: 'center', letterSpacing: '1px' }}>
                              {p.name.split(' ').slice(-1)[0].toUpperCase()} {p.stat.slice(0,3).toUpperCase()} {`>`}{p.line}
                            </span>
                          ))}
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#888', textAlign: 'center', letterSpacing: '1px' }}>PARLAY</span>
                        </div>

                        {team.game_rows.map((row, idx) => (
                          <div key={row.game_id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '8px', padding: '10px 0', borderBottom: idx < team.game_rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', alignItems: 'center' }}>
                            {row.players.map(p => (
                              <div key={p.name} style={{ textAlign: 'center' }}>
                                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: p.hit ? '#33cc33' : '#ff4444', lineHeight: 1 }}>{p.value}</span>
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: p.hit ? '#33cc33' : '#ff4444', marginLeft: '3px' }}>{p.hit ? '✓' : '✗'}</span>
                              </div>
                            ))}
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '1px', color: row.all_hit ? '#33cc33' : '#ff4444' }}>
                                {row.all_hit ? 'HIT' : 'MISS'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── AI PICKS PAGE ────────────────────────────────────────────────────────────
function AiPicksPage({ openInAnalyzer, isMobile }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [games, setGames] = React.useState([]);
  const [validationState, setValidationState] = React.useState({}); // game_id -> {loading, result}

  React.useEffect(() => {
    fetch(`${API_URL}?type=ai_picks`)
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.success) setGames(data.games || []);
        else setError(data.error || 'Failed to load picks');
      })
      .catch(() => { setLoading(false); setError('Failed to connect to API'); });
  }, []);

  const canValidate = (picks) => {
    const counts = {};
    picks.forEach(p => { counts[p.team_abbrev] = (counts[p.team_abbrev] || 0) + 1; });
    return Object.values(counts).some(c => c >= 2);
  };

  const validateParlay = (game) => {
    const gid = game.game_id;
    setValidationState(prev => ({ ...prev, [gid]: { loading: true, result: null } }));
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'parlay_validate', picks: game.picks }),
    })
      .then(r => r.json())
      .then(data => setValidationState(prev => ({ ...prev, [gid]: { loading: false, result: data } })))
      .catch(() => setValidationState(prev => ({ ...prev, [gid]: { loading: false, result: { success: false, error: 'Request failed' } } })));
  };

  const clearValidation = (gid) => {
    setValidationState(prev => { const n = { ...prev }; delete n[gid]; return n; });
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '44px', height: '44px', border: '3px solid rgba(51,204,51,0.15)', borderTopColor: '#33cc33', borderRadius: '50%', animation: 'tbSpin 1s linear infinite', marginBottom: '18px' }} />
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#444', letterSpacing: '1px' }}>Computing picks...</p>
    </div>
  );

  if (error) return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>AI PICKS</h1>
      <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #33cc33, transparent)', marginBottom: '28px' }} />
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', color: '#ff4444', letterSpacing: '3px', marginBottom: '10px' }}>LOAD FAILED</div>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#555' }}>{error}</p>
      </div>
    </div>
  );

  const totalPicks     = games.reduce((s, g) => s + g.picks.length, 0);
  const gamesWithPicks = games.filter(g => g.picks.length > 0).length;

  const headerBlock = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#33cc33', boxShadow: '0 0 8px #33cc33', animation: 'tbPulse 2s infinite', flexShrink: 0 }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '2px', color: '#33cc33' }}>LIVE DATA</span>
      </div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>AI PICKS</h1>
      <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #33cc33, transparent)', marginBottom: '6px' }} />
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444', letterSpacing: '1px', margin: '0 0 4px' }}>
        {today} · Highest-confidence props · Click Analyze → to run full prediction
      </p>
      {totalPicks > 0 && (
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', letterSpacing: '0.5px', margin: '0 0 24px' }}>
          <span style={{ color: '#33cc33' }}>{totalPicks}</span> qualifying prop{totalPicks !== 1 ? 's' : ''} across <span style={{ color: '#33cc33' }}>{gamesWithPicks}</span> game{gamesWithPicks !== 1 ? 's' : ''} today
        </p>
      )}
      {totalPicks === 0 && <div style={{ marginBottom: '24px' }} />}
    </div>
  );

  if (!games.length) return (
    <div>
      {headerBlock}
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏀</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#444', letterSpacing: '3px' }}>NO GAMES TODAY</div>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#a3a3a3', marginTop: '8px' }}>Check back on a game day</p>
      </div>
    </div>
  );

  return (
    <div>
      {headerBlock}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
        {games.map(game => (
          <div key={game.game_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>

            {/* Game header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: '#fff' }}>
                {game.away.logo && <img src={game.away.logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                {game.away.name}
                <span style={{ color: '#a3a3a3', fontSize: '14px' }}>@</span>
                {game.home.logo && <img src={game.home.logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                {game.home.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {game.status === 'inprogress' && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#33cc33', background: 'rgba(51,204,51,0.1)', border: '1px solid rgba(51,204,51,0.25)', borderRadius: '3px', padding: '2px 8px', letterSpacing: '1px' }}>LIVE</span>
                )}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' }}>
                  {new Date(game.scheduled).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {/* Content: validation panel OR normal picks */}
            {validationState[game.game_id]?.loading ? (
              <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid rgba(51,204,51,0.15)', borderTopColor: '#33cc33', borderRadius: '50%', animation: 'tbSpin 1s linear infinite' }} />
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444', letterSpacing: '1px', margin: 0 }}>Validating parlay combinations...</p>
              </div>
            ) : validationState[game.game_id]?.result ? (
              <ValidationResultPanel
                result={validationState[game.game_id].result}
                onBack={() => clearValidation(game.game_id)}
                isMobile={isMobile}
              />
            ) : game.picks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#a3a3a3' }}>
                {game.has_odds_event === false
                  ? 'No player prop markets posted yet for this game'
                  : 'No qualifying picks found for this game'}
              </div>
            ) : (
              <div>
                {game.picks.map((pick, idx) => {
                  const statLabel  = pick.stat.charAt(0).toUpperCase() + pick.stat.slice(1);
                  const trendUp    = pick.trend === 'up';
                  const trendDown  = pick.trend === 'down';
                  const trendArrow = trendUp ? '↑' : trendDown ? '↓' : '→';
                  const trendLabel = trendUp ? 'TRENDING UP' : trendDown ? 'TRENDING DOWN' : 'STABLE';
                  const trendColor = trendUp ? '#33cc33' : trendDown ? '#ff4444' : '#666';
                  const trendGlow  = trendUp ? '0 0 8px rgba(51,204,51,0.4)' : trendDown ? '0 0 8px rgba(255,68,68,0.35)' : 'none';
                  const tierColor  = pick.tier === 'ELITE LOCK' ? '#ffd700'
                                   : pick.tier === 'STRONG PICK' ? '#33cc33'
                                   : '#0096ff';
                  const tierBg     = pick.tier === 'ELITE LOCK' ? 'rgba(255,215,0,0.10)'
                                   : pick.tier === 'STRONG PICK' ? 'rgba(51,204,51,0.08)'
                                   : 'rgba(0,150,255,0.08)';
                  const tierGlow   = pick.tier === 'ELITE LOCK' ? '0 0 10px rgba(255,215,0,0.3)'
                                   : pick.tier === 'STRONG PICK' ? '0 0 10px rgba(51,204,51,0.25)'
                                   : '0 0 10px rgba(0,150,255,0.25)';
                  return (
                    <div key={pick.name + pick.stat} style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '22px 20px',
                      borderBottom: idx < game.picks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      flexWrap: isMobile ? 'wrap' : 'nowrap'
                    }}>

                      {/* Tier label badge */}
                      <div style={{ flex: '0 0 auto', padding: '7px 16px', borderRadius: '6px', border: `1px solid ${tierColor}`, background: tierBg, boxShadow: tierGlow, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: tierColor, letterSpacing: '1.5px', fontWeight: 700 }}>{pick.tier}</div>
                      </div>

                      {/* Player name + trend + avg */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '16px', color: '#fff', fontWeight: 500, marginBottom: '6px' }}>{pick.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {/* Trend pill */}
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: trendColor, border: `1px solid ${trendColor}`, borderRadius: '20px', padding: '2px 10px', letterSpacing: '1px', boxShadow: trendGlow, whiteSpace: 'nowrap' }}>
                            {trendArrow} {trendLabel}
                          </span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#666' }}>
                            AVG {pick.avg != null ? pick.avg.toFixed(1) : '—'} — L5 <span style={{ color: tierColor }}>{pick.last_5_avg != null ? pick.last_5_avg.toFixed(1) : '—'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Stat line + team/stat label below */}
                      <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#555', letterSpacing: '1px', marginBottom: '2px' }}>OVER</div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', color: '#fff', lineHeight: 1, letterSpacing: '1px' }}>{pick.line}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#888', marginTop: '3px', letterSpacing: '0.5px' }}>{pick.team_abbrev} · {statLabel.toUpperCase()}</div>
                      </div>

                      {/* Analyze button */}
                      <button
                        onClick={() => openInAnalyzer(pick)}
                        style={{ flexShrink: 0, padding: '8px 16px', background: 'transparent', border: '1px solid rgba(51,204,51,0.3)', borderRadius: '4px', color: '#33cc33', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,204,51,0.08)'; e.currentTarget.style.borderColor = '#33cc33'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(51,204,51,0.3)'; }}
                      >
                        Analyze →
                      </button>
                    </div>
                  );
                })}

                {/* Validate as Parlay button — only when 2+ picks from same team exist */}
                {canValidate(game.picks) && (
                  <div style={{ padding: isMobile ? '12px 20px' : '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                    <button
                      onClick={() => validateParlay(game)}
                      style={{ padding: '9px 20px', background: 'rgba(0,150,255,0.08)', border: '1px solid rgba(0,150,255,0.35)', borderRadius: '4px', color: '#0096ff', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap', width: isMobile ? '100%' : 'auto' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,150,255,0.15)'; e.currentTarget.style.borderColor = '#0096ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,150,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,150,255,0.35)'; }}
                    >
                      VALIDATE AS PARLAY →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TRENDBET GPT PAGE ────────────────────────────────────────────────────────
function TrendBetGPTPage({ isMobile }) {
  const [question, setQuestion]     = React.useState('');
  const [image, setImage]           = React.useState(null);   // { b64, type, preview }
  const [loading, setLoading]       = React.useState(false);
  const [reply, setReply]           = React.useState(null);
  const [error, setError]           = React.useState(null);
  const fileInputRef                = React.useRef(null);
  const textareaRef                 = React.useRef(null);

  // Paste image anywhere on this page
  React.useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          readImageFile(file, item.type);
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const readImageFile = (file, mimeType) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const b64 = dataUrl.split(',')[1];
      setImage({ b64, type: mimeType || file.type || 'image/png', preview: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) readImageFile(file, file.type);
    e.target.value = '';
  };

  const removeImage = () => setImage(null);

  const submit = () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setReply(null);
    setError(null);
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       'gpt_chat',
        question:   question.trim(),
        image_b64:  image?.b64  || null,
        image_type: image?.type || 'image/png',
      }),
    })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.success) setReply(data.reply);
        else setError(data.error || 'Analysis failed');
      })
      .catch(() => { setLoading(false); setError('Failed to connect'); });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  const examples = [
    'Why didn\'t my parlay hit last night?',
    'Who are the safest NBA props for tonight?',
    'Is LeBron a good pick for 25+ points today?',
    'Explain the injury situation for tonight\'s games',
  ];

  // Render reply with basic formatting (lines starting with ✅/❌/bold)
  const renderReply = (text) => {
    return text.split('\n').map((line, i) => {
      const isHit  = line.startsWith('✅');
      const isMiss = line.startsWith('❌') || line.startsWith('❌');
      const isHead = line.startsWith('**') && line.endsWith('**');
      const color  = isHit ? '#33cc33' : isMiss ? '#ff4444' : '#ccc';
      const cleaned = isHead ? line.replace(/\*\*/g, '') : line;
      return (
        <div key={i} style={{
          fontFamily: isHead ? "'Bebas Neue', sans-serif" : "'Space Mono', monospace",
          fontSize:   isHead ? '14px' : '11px',
          color:      isHead ? '#fff' : color,
          letterSpacing: isHead ? '1px' : '0px',
          marginBottom: line === '' ? '8px' : '4px',
          lineHeight: 1.6,
        }}>
          {cleaned || '\u00a0'}
        </div>
      );
    });
  };

  return (
    <div>
      {/* Header */}
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>TRENDBET GPT</h1>
      <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #33cc33, transparent)', marginBottom: '6px' }} />
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444', letterSpacing: '1px', margin: '0 0 28px' }}>
        AI sports analyst · paste a bet slip or ask anything
      </p>

      <div style={{ maxWidth: '760px' }}>

        {/* Input card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>

          {/* Image preview */}
          {image && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}>
              <img src={image.preview} alt="Bet slip" style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.12)', display: 'block' }} />
              <button
                onClick={removeImage}
                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', color: '#fff', width: '22px', height: '22px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              >×</button>
            </div>
          )}

          {/* Paste hint (only when no image) */}
          {!image && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', padding: '14px', textAlign: 'center', marginBottom: '14px', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(51,204,51,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px' }}>
                📎 PASTE or CLICK to attach a bet slip screenshot
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />

          {/* Question textarea */}
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything — e.g. 'Why didn't my parlay hit?' or 'Best picks for tonight?'"
            style={{
              width: '100%', minHeight: '90px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
              color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '11px',
              padding: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(51,204,51,0.35)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />

          {/* Actions row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#a3a3a3', letterSpacing: '1px' }}>
              {isMobile ? 'TAP ANALYZE' : 'CTRL+ENTER to analyze'}
            </div>
            <button
              onClick={submit}
              disabled={!question.trim() || loading}
              style={{
                padding: '10px 24px', borderRadius: '4px', border: 'none', cursor: question.trim() && !loading ? 'pointer' : 'not-allowed',
                background: question.trim() && !loading ? '#33cc33' : 'rgba(255,255,255,0.06)',
                color: question.trim() && !loading ? '#000' : '#444',
                fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '2px',
              }}
            >
              {loading ? 'ANALYZING...' : 'ANALYZE →'}
            </button>
          </div>
        </div>

        {/* Example prompts */}
        {!reply && !loading && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#a3a3a3', letterSpacing: '2px', marginBottom: '10px' }}>TRY ASKING</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {examples.map(ex => (
                <button
                  key={ex}
                  onClick={() => setQuestion(ex)}
                  style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', color: '#666', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.5px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#33cc33'; e.currentTarget.style.borderColor = 'rgba(51,204,51,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '28px 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(51,204,51,0.15)', borderTopColor: '#33cc33', borderRadius: '50%', animation: 'tbSpin 1s linear infinite', flexShrink: 0 }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444', letterSpacing: '1px' }}>Analyzing with live sports data...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '6px', padding: '16px', marginBottom: '16px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#ff4444' }}>
            {error}
          </div>
        )}

        {/* Reply */}
        {reply && (
          <div style={{ background: 'rgba(51,204,51,0.03)', border: '1px solid rgba(51,204,51,0.12)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', color: '#33cc33', letterSpacing: '2px' }}>TRENDBET GPT ANALYSIS</div>
              <button
                onClick={() => { setReply(null); setQuestion(''); setImage(null); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1px', padding: '4px 10px', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
              >NEW QUESTION</button>
            </div>
            <div>{renderReply(reply)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VALIDATE BET SLIP PAGE ───────────────────────────────────────────────────
function BetValidatePage({ isMobile }) {
  const [image, setImage]     = React.useState(null);  // { b64, type, preview }
  const [loading, setLoading] = React.useState(false);
  const [reply, setReply]     = React.useState(null);
  const [error, setError]     = React.useState(null);
  const fileInputRef          = React.useRef(null);

  // Paste image anywhere on this page
  React.useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          readImageFile(item.getAsFile(), item.type);
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const readImageFile = (file, mimeType) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImage({ b64: dataUrl.split(',')[1], type: mimeType || file.type || 'image/png', preview: dataUrl });
      setReply(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) readImageFile(file, file.type);
    e.target.value = '';
  };

  const analyze = () => {
    if (!image || loading) return;
    setLoading(true);
    setReply(null);
    setError(null);
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       'gpt_chat',
        question:   'Analyze every leg of this bet slip. For each player, fetch their actual game stats from that game and explain whether the leg hit or missed with real numbers — points/rebounds/assists achieved, minutes played, opponent, and final score.',
        image_b64:  image.b64,
        image_type: image.type,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.success) setReply(data.reply);
        else setError(data.error || 'Analysis failed');
      })
      .catch(() => { setLoading(false); setError('Failed to connect'); });
  };

  const reset = () => { setImage(null); setReply(null); setError(null); };

  const renderReply = (text) => text.split('\n').map((line, i) => {
    const isHead = line.startsWith('**') && line.endsWith('**');
    const cleaned = isHead ? line.replace(/\*\*/g, '') : line;
    const isHit  = line.startsWith('✅');
    const isMiss = line.startsWith('❌');
    return (
      <div key={i} style={{
        fontFamily:    isHead ? "'Bebas Neue', sans-serif" : "'Space Mono', monospace",
        fontSize:      isHead ? '14px' : '11px',
        color:         isHead ? '#fff' : isHit ? '#33cc33' : isMiss ? '#ff4444' : '#ccc',
        letterSpacing: isHead ? '1px' : '0px',
        marginBottom:  line === '' ? '10px' : '4px',
        lineHeight:    1.65,
      }}>
        {cleaned || '\u00a0'}
      </div>
    );
  });

  return (
    <div>
      {/* Header */}
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>VALIDATE YOUR BET SLIP</h1>
      <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #33cc33, transparent)', marginBottom: '6px' }} />
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444', letterSpacing: '1px', margin: '0 0 28px' }}>
        Paste or attach your bet slip screenshot — we'll pull real stats for every leg
      </p>

      <div style={{ maxWidth: '720px' }}>

        {/* Upload zone — hidden once result is shown */}
        {!reply && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '24px', marginBottom: '20px' }}>

            {image ? (
              /* Image preview */
              <div>
                <img src={image.preview} alt="Bet slip" style={{ maxWidth: '100%', maxHeight: '340px', display: 'block', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={analyze}
                    disabled={loading}
                    style={{ flex: 1, padding: '12px 0', background: loading ? 'rgba(255,255,255,0.05)' : '#33cc33', color: loading ? '#444' : '#000', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '2px', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'ANALYZING...' : 'ANALYZE SLIP →'}
                  </button>
                  <button
                    onClick={reset}
                    disabled={loading}
                    style={{ padding: '12px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#555'}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ) : (
              /* Drop zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: isMobile ? '48px 24px' : '72px 40px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(51,204,51,0.4)'; e.currentTarget.style.background = 'rgba(51,204,51,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: '32px', marginBottom: '14px', opacity: 0.4 }}>📋</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#fff', letterSpacing: '3px', marginBottom: '8px' }}>PASTE YOUR BET SLIP</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#444', letterSpacing: '1px', marginBottom: '16px' }}>Ctrl+V to paste · or click to upload</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#a3a3a3', letterSpacing: '1px' }}>PNG · JPG · WEBP accepted</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '28px 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(51,204,51,0.15)', borderTopColor: '#33cc33', borderRadius: '50%', animation: 'tbSpin 1s linear infinite', flexShrink: 0 }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444', letterSpacing: '1px' }}>Fetching real stats for each leg...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '6px', padding: '16px', marginBottom: '16px', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#ff4444' }}>
            {error}
          </div>
        )}

        {/* Result */}
        {reply && (
          <div>
            <div style={{ background: 'rgba(51,204,51,0.03)', border: '1px solid rgba(51,204,51,0.12)', borderRadius: '8px', padding: '22px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', color: '#33cc33', letterSpacing: '2px' }}>BET SLIP ANALYSIS</div>
                <button
                  onClick={reset}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1px', padding: '5px 12px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555'}
                >
                  VALIDATE ANOTHER →
                </button>
              </div>
              {/* Slip thumbnail */}
              {image && <img src={image.preview} alt="" style={{ maxHeight: '100px', maxWidth: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', display: 'block', marginBottom: '18px', opacity: 0.7 }} />}
              <div>{renderReply(reply)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function App() {
  const [currentPage, setCurrentPage] = React.useState('home');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prop analyzer state
  const [showPlayerDropdown, setShowPlayerDropdown] = React.useState(false);
  const [sport, setSport] = React.useState('');
  const [player, setPlayer] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stat, setStat] = React.useState('');
  const [opponent, setOpponent] = React.useState(null);
  const [direction, setDirection] = React.useState('');
  const [line, setLine] = React.useState('');
  const [prediction, setPrediction] = React.useState(null);
  const [dataSource, setDataSource] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [oddsData, setOddsData] = React.useState(null);
  const [oddsLoading, setOddsLoading] = React.useState(false);
  const [playerStats, setPlayerStats] = React.useState(null);
  const [playerStatsLoading, setPlayerStatsLoading] = React.useState(false);
  const [legendOpen, setLegendOpen] = React.useState(true);
  const [gameContext, setGameContext] = React.useState(null); // { homeAlias, awayAlias, homeName, awayName, sport }

  // Player/team data from Supabase
  const [allPlayers, setAllPlayers] = React.useState([]);
  const [allTeams, setAllTeams] = React.useState([]);
  const [dataLoading, setDataLoading] = React.useState(true);

  // Parlay state
  const [parlayLegs, setParlayLegs] = React.useState([]);
  const [parlayExpanded, setParlayExpanded] = React.useState(false);
  const [parlayResult, setParlayResult] = React.useState(null);
  const [parlayLoading, setParlayLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          fetch(`${API_URL}?type=players`),
          fetch(`${API_URL}?type=teams`)
        ]);
        const pData = await pRes.json();
        const tData = await tRes.json();
        if (pData.success) setAllPlayers(pData.players);
        if (tData.success) setAllTeams(tData.teams);
      } catch (e) { console.error('Failed to fetch data:', e); }
      setDataLoading(false);
    })();
  }, []);

  // Auto-fetch real Vegas line when player + opponent + stat are all set (NBA only)
  React.useEffect(() => {
    if (!player || !opponent || !stat || sport !== 'NBA') {
      setOddsData(null);
      return;
    }
    setOddsLoading(true);
    const teamName = (player.team_name || '').toLowerCase();
    const oppName  = (opponent.name   || '').toLowerCase();
    fetch(`${API_URL}?type=odds&player_name=${encodeURIComponent(player.name)}&player_id=${player.id || ''}&team_name=${encodeURIComponent(teamName)}&opponent_name=${encodeURIComponent(oppName)}&stat=${encodeURIComponent(stat.toLowerCase())}`)
      .then(r => r.json())
      .then(data => {
        setOddsLoading(false);
        if (data.found) {
          setOddsData(data);
          setLine(String(data.line));
        } else if (data.has_live_odds === false && data.alternate_lines && data.alternate_lines.length > 0) {
          setOddsData(data); // synthetic lines from player game log
        } else {
          setOddsData(null);
        }
      })
      .catch(() => { setOddsLoading(false); setOddsData(null); });
  }, [player, opponent, stat, sport]);

  // When coming from a game card, auto-set the opponent to the other team in the matchup
  React.useEffect(() => {
    if (!player || !gameContext || !sportTeams.length) return;
    const teams = sportTeams.filter(t => t.abbreviation === gameContext.homeAlias || t.abbreviation === gameContext.awayAlias);
    if (teams.length < 2) return;
    const opp = teams.find(t => String(t.id) !== String(player.team_id));
    if (opp) setOpponent(opp);
  }, [player, gameContext]);

  // Fetch player stats (overall + vs opponent) independently of odds — works for any player
  React.useEffect(() => {
    if (!player || !stat || !opponent) {
      setPlayerStats(null);
      return;
    }
    setPlayerStatsLoading(true);
    const oppName = (opponent.name || '').toLowerCase();
    fetch(`${API_URL}?type=player_stats&player_name=${encodeURIComponent(player.name)}&player_id=${player.id || ''}&stat=${encodeURIComponent(stat.toLowerCase())}&opponent_name=${encodeURIComponent(oppName)}&sport=${sport}`)
      .then(r => r.json())
      .then(data => { setPlayerStatsLoading(false); if (data.success) setPlayerStats(data); else setPlayerStats(null); })
      .catch(() => { setPlayerStatsLoading(false); setPlayerStats(null); });
  }, [player, stat, opponent, sport]);

  // Derived data
  const currentStatCategories = statCategoriesBySport[sport] || statCategoriesBySport.NBA;
  const sportPlayers = sport ? allPlayers.filter(p => p.sport === sport || (!p.sport && sport === 'NBA')) : allPlayers;
  const sportTeams = sport ? allTeams.filter(t => t.sport === sport || (!t.sport && sport === 'NBA')) : allTeams;
  // When navigated from a game card, restrict players to those two teams only
  const gameTeams = gameContext
    ? sportTeams.filter(t => t.abbreviation === gameContext.homeAlias || t.abbreviation === gameContext.awayAlias)
    : null;
  const gameTeamPlayerIds = gameTeams && gameTeams.length > 0
    ? new Set(gameTeams.map(t => String(t.id)))
    : null;
  const gameTeamPlayers = gameTeamPlayerIds
    ? sportPlayers.filter(p => gameTeamPlayerIds.has(String(p.team_id)))
    : null;

  // Group players by team for default dropdown display
  const playersByTeam = React.useMemo(() => {
    const pool = gameTeamPlayers || sportPlayers;
    const groups = {};
    pool.forEach(p => {
      const key = `${p.team_city || ''} ${p.team_name || ''}`.trim() || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [gameTeamPlayers, sportPlayers]);

  const filteredPlayers = searchQuery.length > 0
    ? (gameTeamPlayers || sportPlayers).filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 15)
    : null; // null = use playersByTeam grouped view
  const availableOpponents = player
    ? sportTeams.filter(t => String(t.id) !== String(player.team_id))
    : sportTeams;
  const canSubmit = sport && player && stat && opponent && direction && line;

  const navigateToAnalyzer = (game) => {
    const sp = (game.sport || 'NBA').toUpperCase();
    setSport(sp); setPlayer(null); setSearchQuery(''); setStat('');
    setOpponent(null); setDirection(''); setLine(''); setPrediction(null);
    setDataSource(null); setError(null); setShowPlayerDropdown(false);
    setOddsData(null); setOddsLoading(false);
    setPlayerStats(null); setPlayerStatsLoading(false);
    setGameContext({ homeAlias: game.home.alias, awayAlias: game.away.alias, homeName: game.home.name, awayName: game.away.name, sport: sp });
    setCurrentPage('analyzer');
  };

  const openInAnalyzer = (pick) => {
    const sp = 'NBA';
    const foundPlayer = allPlayers.find(p => p.name.toLowerCase() === pick.name.toLowerCase());
    setSport(sp);
    setPlayer(foundPlayer || null);
    setSearchQuery(foundPlayer ? '' : pick.name);
    setStat(pick.stat.charAt(0).toUpperCase() + pick.stat.slice(1));
    setLine(String(pick.line));
    setDirection('OVER');
    setOpponent(null);
    setPrediction(null);
    setDataSource(null);
    setError(null);
    setShowPlayerDropdown(false);
    setOddsData(null);
    setOddsLoading(false);
    setPlayerStats(null);
    setPlayerStatsLoading(false);
    setGameContext({ homeAlias: pick.home.alias, awayAlias: pick.away.alias, homeName: pick.home.name, awayName: pick.away.name, sport: sp });
    setCurrentPage('analyzer');
  };

  const reset = () => {
    setSport(''); setPlayer(null); setSearchQuery(''); setStat('');
    setOpponent(null); setDirection(''); setLine(''); setPrediction(null);
    setDataSource(null); setError(null); setShowPlayerDropdown(false);
    setOddsData(null); setOddsLoading(false);
    setPlayerStats(null); setPlayerStatsLoading(false);
    setGameContext(null);
  };

  const getPrediction = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: player.name, stat_type: stat.toLowerCase(), sport,
          line: parseFloat(line), direction, opponent: `${opponent.city} ${opponent.name}`,
          player_stats: playerStats ? playerStats.player_stats : null,
          player_stats_vs_opp: playerStats ? playerStats.player_stats_vs_opp : null
        })
      });
      const data = await res.json();
      if (data.success) { setPrediction(data.prediction); setDataSource(data.data_source || null); }
      else setError(data.error || 'Prediction failed');
    } catch (e) { setError('Failed to connect to API'); }
    setLoading(false);
  };

  const addToParlay = () => {
    if (parlayLegs.length >= 6) return;
    const newLeg = { id: Date.now(), player: player.name, stat, line: parseFloat(line), direction, opponent: opponent.name, probability: prediction.probability };
    if (!parlayLegs.some(l => l.player === newLeg.player && l.stat === newLeg.stat)) {
      setParlayLegs([...parlayLegs, newLeg]);
      setParlayResult(null);
    }
  };

  const removeFromParlay = (id) => { setParlayLegs(parlayLegs.filter(l => l.id !== id)); setParlayResult(null); };
  const clearParlay = () => { setParlayLegs([]); setParlayResult(null); setParlayExpanded(false); };

  const calculateParlay = async () => {
    if (parlayLegs.length < 2) return;
    setParlayLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'parlay', legs: parlayLegs })
      });
      const data = await res.json();
      if (data.success) setParlayResult(data.parlay);
    } catch (e) { console.error('Parlay failed:', e); }
    setParlayLoading(false);
  };

  const isInParlay = prediction && parlayLegs.some(l =>
    l.player === player?.name && l.stat === stat && l.line === parseFloat(line)
  );

  // Shared field label style
  const fieldLabel = {
    fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '2px',
    color: '#555', textTransform: 'uppercase', marginBottom: '7px', display: 'block'
  };

  const SIDEBAR_W = 220;

  // ─── PAGE CONTENT ──────────────────────────────────────────────────────────
  const renderPage = () => {
    if (dataLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
          <div style={{ width: '44px', height: '44px', border: '3px solid rgba(51,204,51,0.15)', borderTopColor: '#33cc33', borderRadius: '50%', animation: 'tbSpin 1s linear infinite', marginBottom: '18px' }} />
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#444', letterSpacing: '1px' }}>Loading...</p>
        </div>
      );
    }

    if (currentPage === 'home')       return <Dashboard setCurrentPage={setCurrentPage} navigateToAnalyzer={navigateToAnalyzer} />;
    if (currentPage === 'datalab')    return <ComingSoon title="DATA LAB"      icon="📊" description="Player charts and advanced analytics" />;
    if (currentPage === 'ai-picks')   return <AiPicksPage openInAnalyzer={openInAnalyzer} isMobile={isMobile} />;
    if (currentPage === 'arbitrage')  return <ComingSoon title="ARBITRAGE"     icon="⚖️" description="Find value across sportsbooks" />;
    if (currentPage === 'bet-validate') return <BetValidatePage isMobile={isMobile} />;
    if (currentPage === 'gpt')          return <ComingSoon title="TRENDBET GPT" icon="⊛" description="AI sports betting analyst — currently in testing phase" />;

    // ── PROP ANALYZER ────────────────────────────────────────────────────────
    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>PROP ANALYZER</h1>
        <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #33cc33, transparent)', marginBottom: '28px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* LEFT — Form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

            {/* GAME CONTEXT BANNER */}
            {gameContext && (
              <div style={{ background: 'rgba(51,204,51,0.05)', border: '1px solid rgba(51,204,51,0.2)', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#33cc33', letterSpacing: '2px', marginBottom: '4px' }}>GAME CONTEXT</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '2px', color: '#fff' }}>
                    {gameContext.awayName} <span style={{ color: '#444' }}>@</span> {gameContext.homeName}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#555', marginTop: '3px' }}>
                    Showing players from these teams only
                  </div>
                </div>
                <button onClick={() => setGameContext(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', lineHeight: 1 }}>×</button>
              </div>
            )}

            {/* SPORT */}
            <div>
              <span style={fieldLabel}>SPORT</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['NBA', 'NFL', 'MLB'].map(s => (
                  <button key={s}
                    onClick={() => { setSport(s); setPlayer(null); setSearchQuery(''); setStat(''); setOpponent(null); setPrediction(null); setError(null); setShowPlayerDropdown(false); setGameContext(null); }}
                    style={{ flex: 1, padding: '10px 6px', background: sport === s ? 'rgba(51,204,51,0.1)' : 'transparent', border: `1px solid ${sport === s ? '#33cc33' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '17px', letterSpacing: '2px', color: sport === s ? '#33cc33' : '#666', transition: 'all 0.2s' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* PLAYER + TEAM */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <span style={fieldLabel}>PLAYER</span>
                <input
                  type="text"
                  placeholder={sport ? `Search ${sport}...` : 'Select sport first'}
                  value={player ? player.name : searchQuery}
                  disabled={!sport}
                  onChange={e => { setSearchQuery(e.target.value); setPlayer(null); setShowPlayerDropdown(true); }}
                  onFocus={() => { if (sport) setShowPlayerDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowPlayerDropdown(false), 150)}
                  style={{ width: '100%', padding: '10px 12px', background: sport ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${player ? 'rgba(51,204,51,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: player ? '#33cc33' : '#fff', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none' }}
                />
                {showPlayerDropdown && (filteredPlayers ? filteredPlayers.length > 0 : playersByTeam.length > 0) && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#1a1d23', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', zIndex: 200, maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                    {filteredPlayers ? filteredPlayers.map(p => (
                      <div key={p.id}
                        onMouseDown={() => { setPlayer(p); setSearchQuery(''); setShowPlayerDropdown(false); }}
                        style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(51,204,51,0.08)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ fontSize: '12px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#555', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>{p.team_city} {p.team_name}</div>
                      </div>
                    )) : playersByTeam.map(([teamName, players]) => (
                      <div key={teamName}>
                        <div style={{ padding: '5px 12px 3px', fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1.5px', color: '#444', textTransform: 'uppercase', background: '#1a1d23', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'sticky', top: 0 }}>{teamName}</div>
                        {players.map(p => (
                          <div key={p.id}
                            onMouseDown={() => { setPlayer(p); setSearchQuery(''); setShowPlayerDropdown(false); }}
                            style={{ padding: '8px 12px 8px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(51,204,51,0.08)'; e.currentTarget.style.color = '#33cc33'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}
                          >
                            <div style={{ fontSize: '12px', color: '#ddd' }}>{p.name}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {showPlayerDropdown && sport && filteredPlayers && filteredPlayers.length === 0 && searchQuery && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#1a1d23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', zIndex: 200, padding: '10px 12px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                    No players found
                  </div>
                )}
              </div>

              <div>
                <span style={fieldLabel}>PLAYER'S TEAM</span>
                <input type="text" readOnly placeholder="Auto-filled"
                  value={player ? `${player.team_city || ''} ${player.team_name || ''}`.trim() : ''}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none', cursor: 'default' }}
                />
              </div>
            </div>

            {/* OPP TEAM + PROP */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={fieldLabel}>OPPOSING TEAM</span>
                <select value={opponent ? String(opponent.id) : ''}
                  onChange={e => setOpponent(availableOpponents.find(t => String(t.id) === e.target.value) || null)}
                  disabled={!player}
                  style={{ width: '100%', padding: '10px 12px', background: player ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${opponent ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: opponent ? '#ff6b35' : '#555', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none', cursor: player ? 'pointer' : 'default', appearance: 'none', WebkitAppearance: 'none' }}>
                  <option value="">Select team...</option>
                  {availableOpponents.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.city} {t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <span style={fieldLabel}>PROP</span>
                <select value={stat} onChange={e => setStat(e.target.value)} disabled={!sport}
                  style={{ width: '100%', padding: '10px 12px', background: sport ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${stat ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: stat ? '#ffd700' : '#555', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none', cursor: sport ? 'pointer' : 'default', appearance: 'none', WebkitAppearance: 'none' }}>
                  <option value="">Select stat...</option>
                  {currentStatCategories.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* LINE */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <span style={fieldLabel}>LINE</span>
                {oddsLoading && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px' }}>FETCHING ODDS...</span>}
                {oddsData && !oddsLoading && oddsData.has_live_odds !== false && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#33cc33', letterSpacing: '1px', background: 'rgba(51,204,51,0.08)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(51,204,51,0.2)' }}>
                    LIVE • {oddsData.bookmaker}
                  </span>
                )}
                {oddsData && !oddsLoading && oddsData.has_live_odds === false && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    NO LIVE ODDS
                  </span>
                )}
                {playerStatsLoading && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#444', letterSpacing: '1px' }}>LOADING STATS...</span>}
                {playerStats && playerStats.player_stats && !playerStatsLoading && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px' }}>
                    {playerStats.player_stats.games} games · avg {playerStats.player_stats.avg}
                  </span>
                )}
                {playerStats && playerStats.player_stats && playerStats.player_stats.last_5_avg != null && !playerStatsLoading && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#aaa', letterSpacing: '1px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    last 5 · avg {playerStats.player_stats.last_5_avg}
                  </span>
                )}
                {playerStats && playerStats.player_stats_vs_opp && !playerStatsLoading && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#ffd700', letterSpacing: '1px', background: 'rgba(255,215,0,0.07)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(255,215,0,0.2)' }}>
                    vs {opponent ? `${opponent.city} ${opponent.name}` : 'opponent'} · {playerStats.player_stats_vs_opp.games} games · avg {playerStats.player_stats_vs_opp.avg}
                  </span>
                )}
              </div>

              {/* Alternate lines picker */}
              {oddsData && oddsData.alternate_lines && oddsData.alternate_lines.length > 0 ? (() => {
                // Enrich alt lines with hit rates computed from playerStats.values when backend didn't provide them
                const statsVals = playerStats?.player_stats?.values;
                const enrichedLines = oddsData.alternate_lines.map(al => {
                  if (al.hit_rate != null || !statsVals?.length) return al;
                  const hr = statsVals.filter(v => v > al.line).length / statsVals.length;
                  return { ...al, hit_rate: Math.round(hr * 1000) / 1000 };
                });
                const selLine = enrichedLines.find(al => String(al.line) === String(line));
                const selHitPct = selLine?.hit_rate != null ? Math.round(selLine.hit_rate * 100) : null;
                return (
                <>
                  <AltLinesPicker altLines={enrichedLines} line={line} setLine={setLine} setDirection={setDirection} />
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={() => setLegendOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px' }}>HOW TO READ</span>
                      <span style={{ color: '#555', fontSize: '10px', lineHeight: 1 }}>{legendOpen ? '▲' : '▼'}</span>
                    </button>
                    {legendOpen && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px', paddingLeft: '2px' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ display: 'inline-block', width: '18px', height: '3px', background: '#33cc33', borderRadius: '2px' }} />
                          bar = how often player hits OVER this line
                        </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px' }}>
                          <span style={{ color: '#ccc' }}>{selHitPct != null ? `${selHitPct}%` : '—'} overall</span> = season hit rate
                        </span>
                        {oddsData && oddsData.has_live_odds !== false && (
                          <>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px' }}>
                              <span style={{ color: '#33cc33' }}>+8%</span> = better odds than real probability (good value)
                            </span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px' }}>
                              <span style={{ color: '#ff4444' }}>-8%</span> = book overprices this line (bad value)
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
                );
              })() : (
                <input type="number" step="0.5" value={line} onChange={e => setLine(e.target.value)} placeholder="e.g. 25.5"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${oddsData ? 'rgba(51,204,51,0.3)' : line ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '14px', outline: 'none' }}
                />
              )}

              {/* Main line odds + market signal — only when live bookmaker data exists */}
              {oddsData && oddsData.has_live_odds !== false && (() => {
                const toProb = o => o < 0 ? (-o) / (-o + 100) : 100 / (o + 100);
                const overProb  = Math.round(toProb(oddsData.over_odds)  * 100);
                const underProb = oddsData.under_odds ? Math.round(toProb(oddsData.under_odds) * 100) : null;
                const bookLeans = underProb && underProb > overProb ? 'UNDER' : 'OVER';
                const valueOn   = underProb && underProb > overProb ? 'OVER'  : 'UNDER';
                const leanProb  = bookLeans === 'UNDER' ? underProb : overProb;
                return null;
              })()}
            </div>

            {/* DIRECTION */}
            <div>
              <span style={fieldLabel}>DIRECTION</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={() => setDirection('OVER')}
                  style={{ padding: '13px', background: direction === 'OVER' ? 'rgba(51,204,51,0.1)' : 'transparent', border: `2px solid ${direction === 'OVER' ? '#33cc33' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: direction === 'OVER' ? '#33cc33' : '#555', transition: 'all 0.2s' }}>
                  OVER
                </button>
                <button onClick={() => setDirection('UNDER')}
                  style={{ padding: '13px', background: direction === 'UNDER' ? 'rgba(255,68,68,0.1)' : 'transparent', border: `2px solid ${direction === 'UNDER' ? '#ff4444' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: direction === 'UNDER' ? '#ff4444' : '#555', transition: 'all 0.2s' }}>
                  UNDER
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '4px', padding: '12px 14px', color: '#ff4444', fontFamily: "'Space Mono', monospace", fontSize: '11px' }}>
                {error}
              </div>
            )}

            <button onClick={getPrediction} disabled={!canSubmit || loading}
              style={{ width: '100%', padding: '15px', background: canSubmit && !loading ? 'linear-gradient(90deg, #33cc33, #00cc6a)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', cursor: canSubmit && !loading ? 'pointer' : 'not-allowed', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '3px', color: canSubmit && !loading ? '#1a1d23' : '#444', transition: 'all 0.3s' }}>
              {loading ? 'ANALYZING...' : 'ANALYZE PROP \u2192'}
            </button>
          </div>

          {/* RIGHT — Results */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: !prediction && !loading ? 'center' : 'flex-start', alignItems: !prediction && !loading ? 'center' : 'stretch' }}>

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                <div style={{ width: '46px', height: '46px', border: '3px solid rgba(51,204,51,0.2)', borderTopColor: '#33cc33', borderRadius: '50%', margin: '0 auto 20px', animation: 'tbSpin 1s linear infinite' }} />
                <div style={{ fontFamily: "'Space Mono', monospace", color: '#33cc33', fontSize: '11px', letterSpacing: '2px' }}>ANALYZING WITH AI...</div>
              </div>
            )}

            {!prediction && !loading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '44px', marginBottom: '14px', opacity: 0.1 }}>🎯</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', letterSpacing: '4px', color: '#333344', marginBottom: '6px' }}>AWAITING ANALYSIS</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#2a2a40', letterSpacing: '1px' }}>Fill in the form and click Analyze</div>
              </div>
            )}

            {prediction && !loading && (
              <div>
                <div style={{ background: 'linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '36px', marginBottom: '18px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#555', letterSpacing: '2px', marginBottom: '14px' }}>
                    {player.name.toUpperCase()} VS {opponent.name.toUpperCase()}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '44px', color: direction === 'OVER' ? '#33cc33' : '#ff4444' }}>{direction}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '44px', color: '#fff', margin: '0 14px' }}>{line}</span>
                    <span style={{ fontSize: '20px', color: '#777' }}>{stat}</span>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '90px', lineHeight: 1, color: prediction.probability >= 60 ? '#33cc33' : prediction.probability >= 45 ? '#ffd700' : '#ff4444', textShadow: '0 0 50px currentColor' }}>
                    {prediction.probability}%
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#777', marginTop: '14px' }}>
                    CONFIDENCE: <span style={{ color: prediction.confidence === 'high' ? '#33cc33' : prediction.confidence === 'medium' ? '#ffd700' : '#ff4444', textTransform: 'uppercase' }}>{prediction.confidence}</span>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    {dataSource === 'sportradar'
                      ? <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.3)', color: '#00c8ff', borderRadius: '4px', padding: '4px 10px' }}>● LIVE DATA · SPORTRADAR</span>
                      : <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#444', borderRadius: '4px', padding: '4px 10px' }}>● AI KNOWLEDGE ONLY</span>
                    }
                  </div>
                </div>

                {prediction.summary && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ color: '#bbb', lineHeight: 1.6, margin: 0, fontSize: '13px' }}>"{prediction.summary}"</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {prediction.factors && prediction.factors.length > 0 && (
                    <div style={{ background: 'rgba(51,204,51,0.05)', border: '1px solid rgba(51,204,51,0.2)', borderRadius: '4px', padding: '14px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#33cc33', marginBottom: '8px', letterSpacing: '1px' }}>▲ SUPPORTING</div>
                      {prediction.factors.map((f, i) => <div key={i} style={{ fontSize: '11px', color: '#aaa', marginBottom: '5px', paddingLeft: '8px', borderLeft: '2px solid #33cc33' }}>{f}</div>)}
                    </div>
                  )}
                  {prediction.risks && prediction.risks.length > 0 && (
                    <div style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px', padding: '14px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#ff4444', marginBottom: '8px', letterSpacing: '1px' }}>▼ RISKS</div>
                      {prediction.risks.map((r, i) => <div key={i} style={{ fontSize: '11px', color: '#aaa', marginBottom: '5px', paddingLeft: '8px', borderLeft: '2px solid #ff4444' }}>{r}</div>)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={reset}
                    style={{ flex: 1, background: 'transparent', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '12px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#666', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#33cc33'; e.currentTarget.style.color = '#33cc33'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#666'; }}
                  >NEW PREDICTION</button>

                  {!isInParlay && parlayLegs.length < 6 && (
                    <button onClick={addToParlay}
                      style={{ flex: 1, background: 'rgba(138,43,226,0.15)', border: '2px solid rgba(138,43,226,0.4)', borderRadius: '4px', padding: '12px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#a855f7', transition: 'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(138,43,226,0.25)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(138,43,226,0.15)'; }}
                    >+ ADD TO PARLAY</button>
                  )}

                  {isInParlay && (
                    <div style={{ flex: 'none', padding: '12px 18px', background: 'rgba(138,43,226,0.1)', border: '1px solid rgba(138,43,226,0.3)', borderRadius: '4px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ✓ IN PARLAY
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#33334a', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          POWERED BY CLAUDE AI · FOR ENTERTAINMENT PURPOSES ONLY
        </div>
      </div>
    );
  };

  // ─── ROOT LAYOUT ───────────────────────────────────────────────────────────
  const mainPaddingBottom = parlayLegs.length > 0 ? '150px' : '40px';

  return (
    <div style={{ display: 'flex', background: '#1a1d23', minHeight: '100vh', overflowX: 'hidden' }}>
      <GlobalStyles />

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ position: 'fixed', top: '14px', left: '14px', zIndex: 1002, background: 'rgba(12,12,19,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', width: '38px', height: '38px', cursor: 'pointer', color: '#aaa', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', flexShrink: 0 }}
        >
          ☰
        </button>
      )}

      {/* Main content */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : `${SIDEBAR_W}px`,
        minHeight: '100vh',
        background: '#1a1d23',
        transition: 'margin-left 0.28s ease',
        /* Prevents game card rows from overflowing the main column */
        minWidth: 0,
      }}>
        <div style={{ padding: isMobile ? '62px 16px 40px' : '36px 36px 40px', paddingBottom: mainPaddingBottom }}>
          {renderPage()}
        </div>
      </div>

      {/* ─── PARLAY FLOATING BAR ─────────────────────────────────────────── */}
      {parlayLegs.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0,
          left: isMobile ? 0 : `${SIDEBAR_W}px`,
          right: 0,
          background: 'rgba(10,10,15,0.98)',
          borderTop: '1px solid rgba(51,204,51,0.3)',
          zIndex: 999,
          backdropFilter: 'blur(20px)',
          transition: 'left 0.28s ease'
        }}>
          {/* Header */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
            onClick={() => setParlayExpanded(!parlayExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                {parlayLegs.length}
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '1px', color: '#a855f7' }}>PARLAY BUILDER</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555' }}>
                  {parlayLegs.length} leg{parlayLegs.length !== 1 ? 's' : ''} · Tap to {parlayExpanded ? 'collapse' : 'expand'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {parlayLegs.length >= 2 && !parlayExpanded && (
                <button
                  onClick={e => { e.stopPropagation(); calculateParlay(); setParlayExpanded(true); }}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '4px', padding: '8px 16px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '13px', letterSpacing: '1px', color: '#fff', cursor: 'pointer' }}
                >CALCULATE</button>
              )}
              <div style={{ transform: parlayExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', fontSize: '18px', color: '#555' }}>▲</div>
            </div>
          </div>

          {/* Expandable content */}
          <div style={{ maxHeight: parlayExpanded ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease', borderTop: parlayExpanded ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
            {parlayLegs.map((leg, idx) => (
              <div key={leg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#555', width: '18px' }}>#{idx+1}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontFamily: "'Oswald', sans-serif" }}>
                      {leg.player} <span style={{ color: leg.direction === 'OVER' ? '#33cc33' : '#ff4444' }}>{leg.direction}</span> {leg.line} {leg.stat}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555' }}>
                      vs {leg.opponent} · {leg.probability}%
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromParlay(leg.id)} style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '4px', padding: '5px 10px', color: '#ff4444', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              </div>
            ))}

            {parlayResult && (
              <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04))', borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#a855f7', letterSpacing: '2px', marginBottom: '6px' }}>COMBINED PARLAY ODDS</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '50px', color: '#a855f7', textShadow: '0 0 30px rgba(168,85,247,0.5)' }}>{parlayResult.combined_probability}%</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#777', marginTop: '2px' }}>Implied Odds: +{parlayResult.implied_odds}</div>
                </div>
                {parlayResult.analysis && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '10px', marginBottom: '10px' }}>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#bbb', margin: 0, lineHeight: 1.5 }}>{parlayResult.analysis}</p>
                  </div>
                )}
                {parlayResult.correlation_warning && (
                  <div style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '4px', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>⚠️</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#ffd700' }}>{parlayResult.correlation_warning}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '14px 20px', display: 'flex', gap: '10px' }}>
              {parlayLegs.length >= 2 && (
                <button onClick={calculateParlay} disabled={parlayLoading}
                  style={{ flex: 1, background: parlayLoading ? '#333' : 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '4px', padding: '12px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '2px', color: parlayLoading ? '#666' : '#fff', cursor: parlayLoading ? 'not-allowed' : 'pointer' }}>
                  {parlayLoading ? 'CALCULATING...' : 'CALCULATE PARLAY'}
                </button>
              )}
              <button onClick={clearParlay}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '12px 18px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666', cursor: 'pointer' }}>
                CLEAR ALL
              </button>
            </div>

            {parlayLegs.length < 2 && (
              <div style={{ padding: '0 20px 14px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' }}>Add at least 2 legs to calculate parlay odds</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
