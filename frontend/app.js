const API_URL = 'https://stat-prophet.vercel.app/api';


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
    body { margin: 0; padding: 0; background: #0a0a0f; }
    ::-webkit-scrollbar { height: 4px; width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
    select option { background: #111118; color: #fff; }
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
        { id: 'ai-picks',    label: 'AI Picks',       icon: '◈', soon: true },
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
      items: [{ id: 'gpt', label: 'TrendBetGPT', icon: '⬡', soon: true }]
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
        background: '#0c0c13',
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
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #00ff88, #00cc6a)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏀</div>
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
                    onClick={() => !item.soon && navigate(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 18px',
                      cursor: item.soon ? 'default' : 'pointer',
                      background: isActive ? 'rgba(0,255,136,0.07)' : 'transparent',
                      borderLeft: isActive ? '2px solid #00ff88' : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={e => { if (!item.soon && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Icon */}
                    <span style={{ fontSize: '12px', color: isActive ? '#00ff88' : (item.soon ? '#363655' : '#606080'), flexShrink: 0 }}>{item.icon}</span>
                    {/* Label */}
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: item.soon ? '#4a4a68' : (isActive ? '#00ff88' : '#aaaacc'), flex: 1 }}>{item.label}</span>
                    {/* Soon badge */}
                    {item.soon && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: '#3a3a55', letterSpacing: '1px', background: 'rgba(255,255,255,0.04)', padding: '2px 5px', borderRadius: '3px' }}>SOON</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Live Data indicator */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', animation: 'tbPulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '2px', color: '#00ff88' }}>LIVE DATA</span>
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
          e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)';
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', letterSpacing: '1px', color: '#e8e8f0', lineHeight: 1, flexShrink: 0 }}>
              {game.away.alias || (game.away.name || '').slice(0, 3).toUpperCase()}
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#7788aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {game.away.name}
            </span>
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', letterSpacing: '1px', color: '#e8e8f0', lineHeight: 1, flexShrink: 0 }}>
              {game.home.alias || (game.home.name || '').slice(0, 3).toUpperCase()}
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#7788aa', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {game.home.name}
            </span>
          </div>
          {game.home.points != null && (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#fff', letterSpacing: '1px', flexShrink: 0 }}>{game.home.points}</span>
          )}
        </div>

        <button
          onClick={() => navigateToAnalyzer ? navigateToAnalyzer(game) : setCurrentPage('analyzer')}
          style={{ width: '100%', padding: '7px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '5px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#00ff88', transition: 'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.14)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.06)'; }}
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
            <div style={{ width: '28px', height: '28px', border: '2px solid rgba(0,255,136,0.15)', borderTopColor: '#00ff88', borderRadius: '50%', animation: 'tbSpin 1s linear infinite' }} />
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
                  background: 'linear-gradient(to right, #0a0a0f 35%, rgba(10,10,15,0.7) 70%, transparent)',
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
                  background: 'linear-gradient(to left, #0a0a0f 35%, rgba(10,10,15,0.7) 70%, transparent)',
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
        <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #00ff88, transparent)', marginBottom: '10px' }} />
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
      <div style={{ width: '72px', height: '72px', background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '22px' }}>
        {icon}
      </div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px', letterSpacing: '4px', color: '#fff', marginBottom: '10px', textAlign: 'center' }}>{title}</h1>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#555', marginBottom: '24px', textAlign: 'center' }}>{description}</p>
      <div style={{ padding: '10px 28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00ff88' }}>COMING SOON</span>
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
              ? (al.edge > 0.05 ? '#00ff88' : al.edge < -0.05 ? '#ff4444' : '#777')
              : (al.hit_rate != null ? (al.hit_rate > 0.5 ? '#00ff88' : al.hit_rate < 0.5 ? '#ff4444' : '#777') : '#777');
            return (
              <div key={al.line} onClick={() => { setLine(String(al.line)); setDirection('OVER'); }}
                style={{ position: 'relative', minWidth: '76px', cursor: 'pointer',
                  padding: al.best_value ? '14px 8px 10px' : '10px 8px 10px',
                  borderRadius: '6px', textAlign: 'center',
                  border: `2px solid ${isSelected ? '#00ff88' : al.best_value ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background: isSelected ? 'rgba(0,255,136,0.08)' : al.best_value ? 'rgba(255,215,0,0.04)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s' }}>
                {al.best_value && (
                  <div style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)',
                    background: '#ffd700', color: '#000', fontFamily: "'Space Mono', monospace",
                    fontSize: '7px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px',
                    whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>★ BEST VALUE</div>
                )}
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', lineHeight: 1,
                  color: isSelected ? '#00ff88' : al.best_value ? '#ffd700' : '#ccc' }}>{al.line}</div>
                {al.over_odds != null && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', marginTop: '2px',
                    color: isSelected ? '#00ff88' : '#666' }}>
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
                        color: edgePct > 0 ? '#00ff88' : '#ff4444' }}>{edgePct > 0 ? '+' : ''}{edgePct}%</div>
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
    fetch(`${API_URL}?type=odds&player_name=${encodeURIComponent(player.name)}&team_name=${encodeURIComponent(teamName)}&opponent_name=${encodeURIComponent(oppName)}&stat=${encodeURIComponent(stat.toLowerCase())}`)
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
    fetch(`${API_URL}?type=player_stats&player_name=${encodeURIComponent(player.name)}&stat=${encodeURIComponent(stat.toLowerCase())}&opponent_name=${encodeURIComponent(oppName)}&sport=${sport}`)
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
          <div style={{ width: '44px', height: '44px', border: '3px solid rgba(0,255,136,0.15)', borderTopColor: '#00ff88', borderRadius: '50%', animation: 'tbSpin 1s linear infinite', marginBottom: '18px' }} />
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#444', letterSpacing: '1px' }}>Loading...</p>
        </div>
      );
    }

    if (currentPage === 'home')       return <Dashboard setCurrentPage={setCurrentPage} navigateToAnalyzer={navigateToAnalyzer} />;
    if (currentPage === 'datalab')    return <ComingSoon title="DATA LAB"      icon="📊" description="Player charts and advanced analytics" />;
    if (currentPage === 'ai-picks')   return <ComingSoon title="AI PICKS"      icon="✦" description="AI-powered daily picks" />;
    if (currentPage === 'arbitrage')  return <ComingSoon title="ARBITRAGE"     icon="⚖️" description="Find value across sportsbooks" />;
    if (currentPage === 'gpt')        return <ComingSoon title="TRENDBET GPT"  icon="🤖" description="AI sports betting assistant" />;

    // ── PROP ANALYZER ────────────────────────────────────────────────────────
    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', letterSpacing: '4px', color: '#fff', margin: '0 0 6px' }}>PROP ANALYZER</h1>
        <div style={{ height: '2px', width: '36px', background: 'linear-gradient(90deg, #00ff88, transparent)', marginBottom: '28px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* LEFT — Form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

            {/* GAME CONTEXT BANNER */}
            {gameContext && (
              <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#00ff88', letterSpacing: '2px', marginBottom: '4px' }}>GAME CONTEXT</div>
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
                    style={{ flex: 1, padding: '10px 6px', background: sport === s ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${sport === s ? '#00ff88' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '17px', letterSpacing: '2px', color: sport === s ? '#00ff88' : '#666', transition: 'all 0.2s' }}>
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
                  style={{ width: '100%', padding: '10px 12px', background: sport ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${player ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: player ? '#00ff88' : '#fff', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none' }}
                />
                {showPlayerDropdown && (filteredPlayers ? filteredPlayers.length > 0 : playersByTeam.length > 0) && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', zIndex: 200, maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                    {filteredPlayers ? filteredPlayers.map(p => (
                      <div key={p.id}
                        onMouseDown={() => { setPlayer(p); setSearchQuery(''); setShowPlayerDropdown(false); }}
                        style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.08)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ fontSize: '12px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#555', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>{p.team_city} {p.team_name}</div>
                      </div>
                    )) : playersByTeam.map(([teamName, players]) => (
                      <div key={teamName}>
                        <div style={{ padding: '5px 12px 3px', fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1.5px', color: '#444', textTransform: 'uppercase', background: '#0d0d14', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'sticky', top: 0 }}>{teamName}</div>
                        {players.map(p => (
                          <div key={p.id}
                            onMouseDown={() => { setPlayer(p); setSearchQuery(''); setShowPlayerDropdown(false); }}
                            style={{ padding: '8px 12px 8px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.08)'; e.currentTarget.style.color = '#00ff88'; }}
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
                  <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', zIndex: 200, padding: '10px 12px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
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
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#00ff88', letterSpacing: '1px', background: 'rgba(0,255,136,0.08)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(0,255,136,0.2)' }}>
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
              {oddsData && oddsData.alternate_lines && oddsData.alternate_lines.length > 0 ? (
                <>
                  <AltLinesPicker altLines={oddsData.alternate_lines} line={line} setLine={setLine} setDirection={setDirection} />
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={() => setLegendOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px' }}>HOW TO READ</span>
                      <span style={{ color: '#555', fontSize: '10px', lineHeight: 1 }}>{legendOpen ? '▲' : '▼'}</span>
                    </button>
                    {legendOpen && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px', paddingLeft: '2px' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ display: 'inline-block', width: '18px', height: '3px', background: '#00ff88', borderRadius: '2px' }} />
                          bar = how often player hits OVER this line
                        </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px' }}>
                          <span style={{ color: '#ccc' }}>54% overall</span> = season hit rate
                        </span>
                        {oddsData && oddsData.has_live_odds !== false && (
                          <>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', letterSpacing: '0.5px' }}>
                              <span style={{ color: '#00ff88' }}>+8%</span> = better odds than real probability (good value)
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
              ) : (
                <input type="number" step="0.5" value={line} onChange={e => setLine(e.target.value)} placeholder="e.g. 25.5"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${oddsData ? 'rgba(0,255,136,0.3)' : line ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '14px', outline: 'none' }}
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
                return (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '6px' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#00ff88' }}>
                        OVER {oddsData.over_odds > 0 ? '+' : ''}{oddsData.over_odds}
                      </span>
                      {oddsData.under_odds && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#ff6666' }}>
                          UNDER {oddsData.under_odds > 0 ? '+' : ''}{oddsData.under_odds}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', letterSpacing: '1px' }}>MARKET SIGNAL  </span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: bookLeans === 'OVER' ? '#00ff88' : '#ff6666', letterSpacing: '1px' }}>
                        Book leans {bookLeans} ({leanProb}% implied)
                      </span>
                      {underProb && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#555', marginLeft: '8px' }}>
                          · value side: <span style={{ color: valueOn === 'OVER' ? '#00ff88' : '#ff6666' }}>{valueOn}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* DIRECTION */}
            <div>
              <span style={fieldLabel}>DIRECTION</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={() => setDirection('OVER')}
                  style={{ padding: '13px', background: direction === 'OVER' ? 'rgba(0,255,136,0.1)' : 'transparent', border: `2px solid ${direction === 'OVER' ? '#00ff88' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: direction === 'OVER' ? '#00ff88' : '#555', transition: 'all 0.2s' }}>
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
              style={{ width: '100%', padding: '15px', background: canSubmit && !loading ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', cursor: canSubmit && !loading ? 'pointer' : 'not-allowed', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '3px', color: canSubmit && !loading ? '#0a0a0f' : '#444', transition: 'all 0.3s' }}>
              {loading ? 'ANALYZING...' : 'ANALYZE PROP \u2192'}
            </button>
          </div>

          {/* RIGHT — Results */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: !prediction && !loading ? 'center' : 'flex-start', alignItems: !prediction && !loading ? 'center' : 'stretch' }}>

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                <div style={{ width: '46px', height: '46px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', margin: '0 auto 20px', animation: 'tbSpin 1s linear infinite' }} />
                <div style={{ fontFamily: "'Space Mono', monospace", color: '#00ff88', fontSize: '11px', letterSpacing: '2px' }}>ANALYZING WITH AI...</div>
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
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '44px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '44px', color: '#fff', margin: '0 14px' }}>{line}</span>
                    <span style={{ fontSize: '20px', color: '#777' }}>{stat}</span>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '90px', lineHeight: 1, color: prediction.probability >= 60 ? '#00ff88' : prediction.probability >= 45 ? '#ffd700' : '#ff4444', textShadow: '0 0 50px currentColor' }}>
                    {prediction.probability}%
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#777', marginTop: '14px' }}>
                    CONFIDENCE: <span style={{ color: prediction.confidence === 'high' ? '#00ff88' : prediction.confidence === 'medium' ? '#ffd700' : '#ff4444', textTransform: 'uppercase' }}>{prediction.confidence}</span>
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
                    <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '14px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#00ff88', marginBottom: '8px', letterSpacing: '1px' }}>▲ SUPPORTING</div>
                      {prediction.factors.map((f, i) => <div key={i} style={{ fontSize: '11px', color: '#aaa', marginBottom: '5px', paddingLeft: '8px', borderLeft: '2px solid #00ff88' }}>{f}</div>)}
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
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88'; }}
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
    <div style={{ display: 'flex', background: '#0a0a0f', minHeight: '100vh', overflowX: 'hidden' }}>
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
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
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
          borderTop: '1px solid rgba(0,255,136,0.3)',
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
                      {leg.player} <span style={{ color: leg.direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{leg.direction}</span> {leg.line} {leg.stat}
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
