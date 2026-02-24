const API_URL = 'https://stat-prophet.vercel.app/api';

const featuredPlayerNames = {
  NBA: ['LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Doncic',
        'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokic',
        'Anthony Edwards', 'Shai Gilgeous-Alexander', 'Ja Morant', 'Victor Wembanyama'],
  NFL: ['Patrick Mahomes', 'Josh Allen', 'Lamar Jackson', 'Joe Burrow',
        'Jalen Hurts', 'Saquon Barkley', 'CeeDee Lamb', 'Tyreek Hill',
        'Justin Jefferson', 'Travis Kelce', 'Christian McCaffrey', "Ja'Marr Chase"],
  MLB: ['Shohei Ohtani', 'Aaron Judge', 'Freddie Freeman', 'Yordan Alvarez',
        'Ronald Acuna Jr.', 'Manny Machado', 'Vladimir Guerrero Jr.', 'Juan Soto',
        'Corey Seager', 'Bobby Witt Jr.', 'Mookie Betts', 'Bryce Harper']
};

const statCategoriesBySport = {
  NBA: ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks'],
  NFL: ['Passing Yards', 'Passing TDs', 'Rushing Yards', 'Receiving Yards', 'Receptions', 'Touchdowns'],
  MLB: ['Hits', 'Strikeouts', 'Home Runs', 'RBIs', 'Total Bases', 'Walks']
};

const sportEmojis = { NBA: '🏀', NFL: '🏈', MLB: '⚾' };

// Navigation Component
function Navbar({ currentPage, setCurrentPage }) {
  const navStyles = {
    nav: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1001
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    logoIcon: {
      width: '32px',
      height: '32px',
      background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px'
    },
    logoText: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: '20px',
      letterSpacing: '2px',
      color: '#fff'
    },
    navLinks: {
      display: 'flex',
      gap: '4px'
    },
    navLink: (active) => ({
      padding: '8px 16px',
      background: active ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
      border: active ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid transparent',
      borderRadius: '6px',
      fontFamily: "'Space Mono', monospace",
      fontSize: '11px',
      letterSpacing: '1px',
      color: active ? '#00ff88' : '#888',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    })
  };

  return (
    <nav style={navStyles.nav}>
      <div style={navStyles.logo} onClick={() => setCurrentPage('home')}>
        <div style={navStyles.logoIcon}>🏀</div>
        <span style={navStyles.logoText}>TRENDBET</span>
      </div>
      
      <div style={navStyles.navLinks}>
        {[
          { id: 'home', label: 'HOME' },
          { id: 'analyzer', label: 'PROP ANALYZER' },
          { id: 'datalab', label: 'DATA LAB' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={navStyles.navLink(currentPage === item.id)}
            onMouseOver={e => {
              if (currentPage !== item.id) {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseOut={e => {
              if (currentPage !== item.id) {
                e.currentTarget.style.color = '#888';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Coming Soon Component
function ComingSoon({ title, icon, description }) {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '60px',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Oswald', sans-serif"
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        marginBottom: '24px'
      }}>
        {icon}
      </div>
      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '48px',
        letterSpacing: '4px',
        color: '#fff',
        marginBottom: '12px'
      }}>
        {title}
      </h1>
      <p style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '14px',
        color: '#666',
        marginBottom: '8px'
      }}>
        {description}
      </p>
      <div style={{
        marginTop: '24px',
        padding: '12px 32px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '4px'
      }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#00ff88' }}>
          COMING SOON
        </span>
      </div>
    </div>
  );
}

// Home Page Component
function HomePage({ setCurrentPage }) {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '60px',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
      fontFamily: "'Oswald', sans-serif"
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '80px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '8px 24px',
          background: 'linear-gradient(90deg, #00ff88, #00cc6a)',
          color: '#0a0a0f',
          fontSize: '12px',
          fontFamily: "'Space Mono', monospace",
          fontWeight: '700',
          letterSpacing: '3px',
          marginBottom: '24px'
        }}>
          AI-POWERED ANALYTICS
        </div>
        
        <h1 style={{
          fontSize: 'clamp(56px, 12vw, 100px)',
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: '4px',
          background: 'linear-gradient(180deg, #fff 0%, #888 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          lineHeight: 1
        }}>
          TREND<span style={{ WebkitTextFillColor: '#00ff88' }}>BET</span>
        </h1>
        
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '14px',
          color: '#666',
          letterSpacing: '2px',
          marginBottom: '60px'
        }}>
          NEXT-GEN SPORTS PROP PREDICTIONS
        </p>

        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div 
            onClick={() => setCurrentPage('analyzer')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '8px',
              padding: '32px 40px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              minWidth: '200px'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#00ff88';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,255,136,0.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎯</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', color: '#00ff88', marginBottom: '8px' }}>
              PROP ANALYZER
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>
              AI-powered predictions
            </div>
          </div>

          <div
            onClick={() => setCurrentPage('datalab')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '32px 40px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              minWidth: '200px',
              opacity: 0.6
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', color: '#fff', marginBottom: '8px' }}>
              DATA LAB
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>
              Coming soon
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '32px 40px',
              cursor: 'default',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              minWidth: '200px',
              opacity: 0.6
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚖️</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', color: '#fff', marginBottom: '8px' }}>
              ARBITRAGE
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>
              Coming soon
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '32px 40px',
              cursor: 'default',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              minWidth: '200px',
              opacity: 0.6
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🤖</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '2px', color: '#fff', marginBottom: '8px' }}>
              TRENDBET GPT
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>
              Coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = React.useState('home');
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
  
  // Data from Supabase
  const [allPlayers, setAllPlayers] = React.useState([]);
  const [allTeams, setAllTeams] = React.useState([]);
  const [dataLoading, setDataLoading] = React.useState(true);

  // Parlay state
  const [parlayLegs, setParlayLegs] = React.useState([]);
  const [parlayExpanded, setParlayExpanded] = React.useState(false);
  const [parlayResult, setParlayResult] = React.useState(null);
  const [parlayLoading, setParlayLoading] = React.useState(false);

  // Fetch players and teams on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [playersRes, teamsRes] = await Promise.all([
          fetch(`${API_URL}?type=players`),
          fetch(`${API_URL}?type=teams`)
        ]);
        const playersData = await playersRes.json();
        const teamsData = await teamsRes.json();
        
        if (playersData.success) setAllPlayers(playersData.players);
        if (teamsData.success) setAllTeams(teamsData.teams);
      } catch (e) {
        console.error('Failed to fetch data:', e);
      }
      setDataLoading(false);
    };
    fetchData();
  }, []);

  // Sport-specific derived data
  const currentFeaturedNames = featuredPlayerNames[sport] || featuredPlayerNames.NBA;
  const currentStatCategories = statCategoriesBySport[sport] || statCategoriesBySport.NBA;
  const sportPlayers = sport ? allPlayers.filter(p => p.sport === sport || (!p.sport && sport === 'NBA')) : allPlayers;
  const sportTeams = sport ? allTeams.filter(t => t.sport === sport || (!t.sport && sport === 'NBA')) : allTeams;

  // Get featured players from loaded data (filtered by sport)
  const featuredPlayers = sportPlayers.filter(p => currentFeaturedNames.includes(p.name));

  // Filter players based on search (within selected sport)
  const filteredPlayers = searchQuery.length > 0
    ? sportPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : featuredPlayers.slice(0, 8);

  // Get available opponents (exclude player's own team, filtered by sport)
  const availableOpponents = player
    ? sportTeams.filter(t => String(t.id) !== String(player.team_id))
    : sportTeams;

  const reset = () => {
    setSport(''); setPlayer(null); setSearchQuery(''); setStat('');
    setOpponent(null); setDirection(''); setLine(''); setPrediction(null); setDataSource(null); setError(null); setShowPlayerDropdown(false);
  };

  const canSubmit = sport && player && stat && opponent && direction && line;

  const getPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: player.name,
          stat_type: stat.toLowerCase(),
          sport: sport,
          line: parseFloat(line),
          direction: direction,
          opponent: `${opponent.city} ${opponent.name}`
        })
      });
      const data = await res.json();
      if (data.success) { setPrediction(data.prediction); setDataSource(data.data_source || null); }
      else setError(data.error || 'Prediction failed');
    } catch (e) {
      setError('Failed to connect to API');
    }
    setLoading(false);
  };

  // Parlay functions
  const addToParlay = () => {
    if (parlayLegs.length >= 6) return;
    
    const newLeg = {
      id: Date.now(),
      player: player.name,
      stat: stat,
      line: parseFloat(line),
      direction: direction,
      opponent: opponent.name,
      probability: prediction.probability
    };
    
    // Check if same player/stat combo already exists
    const exists = parlayLegs.some(leg => 
      leg.player === newLeg.player && leg.stat === newLeg.stat
    );
    
    if (!exists) {
      setParlayLegs([...parlayLegs, newLeg]);
      setParlayResult(null); // Reset parlay result when legs change
    }
  };

  const removeFromParlay = (id) => {
    setParlayLegs(parlayLegs.filter(leg => leg.id !== id));
    setParlayResult(null);
  };

  const clearParlay = () => {
    setParlayLegs([]);
    setParlayResult(null);
    setParlayExpanded(false);
  };

  const calculateParlay = async () => {
    if (parlayLegs.length < 2) return;
    
    setParlayLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'parlay',
          legs: parlayLegs
        })
      });
      const data = await res.json();
      if (data.success) {
        setParlayResult(data.parlay);
      }
    } catch (e) {
      console.error('Parlay calculation failed:', e);
    }
    setParlayLoading(false);
  };

  const isInParlay = prediction && parlayLegs.some(leg => 
    leg.player === player.name && leg.stat === stat && leg.line === parseFloat(line)
  );

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', fontFamily: "'Oswald', sans-serif", color: '#fff', padding: '100px 20px 40px', paddingBottom: parlayLegs.length > 0 ? '140px' : '40px' },
    header: { textAlign: 'center', marginBottom: '60px' },
    badge: { display: 'inline-block', padding: '8px 24px', background: 'linear-gradient(90deg, #00ff88, #00cc6a)', color: '#0a0a0f', fontSize: '12px', fontFamily: "'Space Mono', monospace", fontWeight: '700', letterSpacing: '3px', marginBottom: '20px' },
    title: { fontSize: 'clamp(48px, 10vw, 80px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '4px', background: 'linear-gradient(180deg, #fff 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#666', letterSpacing: '2px' },
    progress: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '50px' },
    sectionTitle: { textAlign: 'center', fontSize: '24px', fontWeight: '300', letterSpacing: '4px', marginBottom: '40px', color: '#888' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', maxWidth: '900px', margin: '0 auto' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '16px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    sportCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '40px 60px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    backBtn: { background: 'none', border: 'none', color: '#00ff88', fontFamily: "'Space Mono', monospace", fontSize: '12px', cursor: 'pointer', marginBottom: '30px' },
    searchContainer: { maxWidth: '500px', margin: '0 auto 30px', position: 'relative' },
    searchInput: { width: '100%', padding: '16px 24px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontFamily: "'Oswald', sans-serif", fontSize: '18px', outline: 'none', transition: 'border-color 0.3s' },
    lineInput: { width: '120px', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '24px', textAlign: 'center', outline: 'none' },
    primaryBtn: { background: 'linear-gradient(90deg, #00ff88, #00cc6a)', border: 'none', borderRadius: '4px', padding: '20px 60px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '3px', color: '#0a0a0f' },
    disabledBtn: { background: '#333', color: '#666', cursor: 'not-allowed' },
    directionBtn: { flex: 1, padding: '30px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s', background: 'rgba(255,255,255,0.03)' },
    resultCard: { background: 'linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '50px', marginBottom: '24px', textAlign: 'center' },
    footer: { textAlign: 'center', marginTop: '80px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' },
    teamCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '14px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    loadingSpinner: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' },
    fieldLabel: { fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '2px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' },
    // Parlay styles
    parlayBar: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(10, 10, 15, 0.98)',
      borderTop: '1px solid rgba(0, 255, 136, 0.3)',
      padding: '0',
      zIndex: 1000,
      backdropFilter: 'blur(20px)',
      transition: 'all 0.3s ease'
    },
    parlayHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      cursor: 'pointer'
    },
    parlayContent: {
      maxHeight: parlayExpanded ? '400px' : '0',
      overflow: 'hidden',
      transition: 'max-height 0.3s ease',
      borderTop: parlayExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none'
    },
    parlayLeg: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    },
    addToParlayBtn: {
      flex: 1,
      background: 'rgba(138, 43, 226, 0.2)',
      border: '2px solid rgba(138, 43, 226, 0.5)',
      borderRadius: '4px',
      padding: '16px',
      cursor: 'pointer',
      fontFamily: "'Space Mono', monospace",
      fontSize: '14px',
      color: '#a855f7',
      transition: 'all 0.3s'
    }
  };

  // Loading state
  if (dataLoading) {
    return (
      <>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div style={{...styles.container, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div style={styles.loadingSpinner}>
            <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
          <p style={{ textAlign: 'center', color: '#666', fontFamily: "'Space Mono', monospace" }}>Loading players...</p>
        </div>
      </>
    );
  }

  // Page routing
  if (currentPage === 'home') {
    return (
      <>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <HomePage setCurrentPage={setCurrentPage} />
      </>
    );
  }

  if (currentPage === 'datalab') {
    return (
      <>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <ComingSoon 
          title="DATA LAB" 
          icon="📊" 
          description="Player charts and advanced analytics"
        />
      </>
    );
  }

  // Prop Analyzer (currentPage === 'analyzer')

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div style={styles.container}>

        {/* Two-column Prop Analyzer */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 40px' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '4px', color: '#fff', margin: '0 0 8px' }}>PROP ANALYZER</h1>
          <div style={{ height: '2px', width: '50px', background: 'linear-gradient(90deg, #00ff88, transparent)', marginBottom: '32px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>

            {/* LEFT — Form Card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

              {/* SPORT */}
              <div>
                <div style={styles.fieldLabel}>SPORT</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['NBA', 'NFL', 'MLB'].map(s => (
                    <button key={s}
                      onClick={() => { setSport(s); setPlayer(null); setSearchQuery(''); setStat(''); setOpponent(null); setPrediction(null); setError(null); setShowPlayerDropdown(false); }}
                      style={{ flex: 1, padding: '10px 6px', background: sport === s ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${sport === s ? '#00ff88' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '17px', letterSpacing: '2px', color: sport === s ? '#00ff88' : '#888', transition: 'all 0.2s' }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* PLAYER + TEAM */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={styles.fieldLabel}>PLAYER</div>
                  <input
                    type="text"
                    placeholder={sport ? `Search ${sport}...` : 'Select sport first'}
                    value={player ? player.name : searchQuery}
                    disabled={!sport}
                    onChange={e => { setSearchQuery(e.target.value); setPlayer(null); setShowPlayerDropdown(true); }}
                    onFocus={() => { if (sport) setShowPlayerDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowPlayerDropdown(false), 150)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: sport ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${player ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: player ? '#00ff88' : '#fff', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none' }}
                  />
                  {showPlayerDropdown && filteredPlayers.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', zIndex: 200, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                      {filteredPlayers.map(p => (
                        <div key={p.id}
                          onMouseDown={() => { setPlayer(p); setSearchQuery(''); setShowPlayerDropdown(false); }}
                          style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.08)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ fontSize: '12px', color: '#fff' }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: '#555', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>{p.team_city} {p.team_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showPlayerDropdown && sport && filteredPlayers.length === 0 && searchQuery && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', zIndex: 200, padding: '10px 12px', color: '#555', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                      No players found
                    </div>
                  )}
                </div>

                <div>
                  <div style={styles.fieldLabel}>PLAYER'S TEAM</div>
                  <input type="text" readOnly placeholder="Auto-filled"
                    value={player ? `${player.team_city || ''} ${player.team_name || ''}`.trim() : ''}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: '#666', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none', cursor: 'default' }}
                  />
                </div>
              </div>

              {/* OPP TEAM + PROP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={styles.fieldLabel}>OPPOSING TEAM</div>
                  <select value={opponent ? String(opponent.id) : ''}
                    onChange={e => setOpponent(availableOpponents.find(t => String(t.id) === e.target.value) || null)}
                    disabled={!player}
                    style={{ width: '100%', padding: '10px 12px', background: player ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${opponent ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: opponent ? '#ff6b35' : '#666', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none', cursor: player ? 'pointer' : 'default', appearance: 'none', WebkitAppearance: 'none' }}>
                    <option value="">Select team...</option>
                    {availableOpponents.map(t => (
                      <option key={t.id} value={String(t.id)} style={{ background: '#111118', color: '#fff' }}>{t.city} {t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={styles.fieldLabel}>PROP</div>
                  <select value={stat}
                    onChange={e => setStat(e.target.value)}
                    disabled={!sport}
                    style={{ width: '100%', padding: '10px 12px', background: sport ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${stat ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: stat ? '#ffd700' : '#666', fontFamily: "'Space Mono', monospace", fontSize: '11px', outline: 'none', cursor: sport ? 'pointer' : 'default', appearance: 'none', WebkitAppearance: 'none' }}>
                    <option value="">Select stat...</option>
                    {currentStatCategories.map(s => (
                      <option key={s} value={s} style={{ background: '#111118', color: '#fff' }}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LINE */}
              <div>
                <div style={styles.fieldLabel}>LINE</div>
                <input type="number" step="0.5" value={line}
                  onChange={e => setLine(e.target.value)}
                  placeholder="e.g. 25.5"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${line ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '14px', outline: 'none' }}
                />
              </div>

              {/* DIRECTION */}
              <div>
                <div style={styles.fieldLabel}>DIRECTION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => setDirection('OVER')}
                    style={{ padding: '13px', background: direction === 'OVER' ? 'rgba(0,255,136,0.1)' : 'transparent', border: `2px solid ${direction === 'OVER' ? '#00ff88' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: direction === 'OVER' ? '#00ff88' : '#666', transition: 'all 0.2s' }}>
                    OVER
                  </button>
                  <button onClick={() => setDirection('UNDER')}
                    style={{ padding: '13px', background: direction === 'UNDER' ? 'rgba(255,68,68,0.1)' : 'transparent', border: `2px solid ${direction === 'UNDER' ? '#ff4444' : 'rgba(255,255,255,0.12)'}`, borderRadius: '4px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '2px', color: direction === 'UNDER' ? '#ff4444' : '#666', transition: 'all 0.2s' }}>
                    UNDER
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '4px', padding: '12px 14px', color: '#ff4444', fontFamily: "'Space Mono', monospace", fontSize: '11px' }}>
                  {error}
                </div>
              )}

              {/* ANALYZE */}
              <button onClick={getPrediction} disabled={!canSubmit || loading}
                style={{ width: '100%', padding: '15px', background: canSubmit && !loading ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', cursor: canSubmit && !loading ? 'pointer' : 'not-allowed', fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '3px', color: canSubmit && !loading ? '#0a0a0f' : '#555', transition: 'all 0.3s' }}>
                {loading ? 'ANALYZING...' : 'ANALYZE PROP \u2192'}
              </button>
            </div>

            {/* RIGHT — Results Panel */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '28px', minHeight: '420px', display: 'flex', flexDirection: 'column', justifyContent: !prediction && !loading ? 'center' : 'flex-start', alignItems: !prediction && !loading ? 'center' : 'stretch' }}>

              {/* Loading */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                  <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontFamily: "'Space Mono', monospace", color: '#00ff88', fontSize: '12px', letterSpacing: '2px' }}>ANALYZING WITH AI...</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {/* Placeholder */}
              {!prediction && !loading && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.15 }}>🎯</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '4px', color: '#2a2a3a', marginBottom: '8px' }}>AWAITING ANALYSIS</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#2a2a3a', letterSpacing: '1px' }}>Fill in the form and click Analyze</div>
                </div>
              )}

              {/* Results */}
              {prediction && !loading && (
                <div>
                  <div style={styles.resultCard}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#666', letterSpacing: '2px', marginBottom: '16px' }}>
                      {player.name.toUpperCase()} VS {opponent.name.toUpperCase()}
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: '#fff', margin: '0 16px' }}>{line}</span>
                      <span style={{ fontSize: '24px', color: '#888' }}>{stat}</span>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '100px', lineHeight: 1, color: prediction.probability >= 60 ? '#00ff88' : prediction.probability >= 45 ? '#ffd700' : '#ff4444', textShadow: '0 0 60px currentColor' }}>
                      {prediction.probability}%
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#888', marginTop: '16px' }}>
                      CONFIDENCE: <span style={{ color: prediction.confidence === 'high' ? '#00ff88' : prediction.confidence === 'medium' ? '#ffd700' : '#ff4444', textTransform: 'uppercase' }}>{prediction.confidence}</span>
                    </div>
                    <div style={{ marginTop: '14px' }}>
                      {dataSource === 'sportradar'
                        ? <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '1px', background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.3)', color: '#00c8ff', borderRadius: '4px', padding: '4px 10px' }}>● LIVE DATA · SPORTRADAR</span>
                        : <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#555', borderRadius: '4px', padding: '4px 10px' }}>● AI KNOWLEDGE ONLY</span>
                      }
                    </div>
                  </div>

                  {prediction.summary && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '20px', marginBottom: '20px' }}>
                      <p style={{ color: '#ccc', lineHeight: 1.6, margin: 0, fontSize: '14px' }}>"{prediction.summary}"</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {prediction.factors && prediction.factors.length > 0 && (
                      <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '16px' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#00ff88', marginBottom: '10px', letterSpacing: '1px' }}>▲ SUPPORTING FACTORS</div>
                        {prediction.factors.map((f, i) => <div key={i} style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #00ff88' }}>{f}</div>)}
                      </div>
                    )}
                    {prediction.risks && prediction.risks.length > 0 && (
                      <div style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px', padding: '16px' }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#ff4444', marginBottom: '10px', letterSpacing: '1px' }}>▼ RISK FACTORS</div>
                        {prediction.risks.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #ff4444' }}>{r}</div>)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={reset}
                      style={{ flex: 1, background: 'transparent', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '14px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '13px', color: '#888', transition: 'all 0.3s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#888'; }}
                    >NEW PREDICTION</button>

                    {!isInParlay && parlayLegs.length < 6 && (
                      <button onClick={addToParlay}
                        style={styles.addToParlayBtn}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(138, 43, 226, 0.3)'; e.currentTarget.style.borderColor = '#a855f7'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)'; e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.5)'; }}
                      >+ ADD TO PARLAY</button>
                    )}

                    {isInParlay && (
                      <div style={{ flex: 'none', padding: '14px 20px', background: 'rgba(138, 43, 226, 0.1)', border: '1px solid rgba(138, 43, 226, 0.3)', borderRadius: '4px', fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✓ IN PARLAY
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      <footer style={styles.footer}>POWERED BY CLAUDE AI • FOR ENTERTAINMENT PURPOSES ONLY</footer>

      {/* Parlay Floating Bar */}
      {parlayLegs.length > 0 && (
        <div style={styles.parlayBar}>
          {/* Header - Always visible */}
          <div 
            style={styles.parlayHeader}
            onClick={() => setParlayExpanded(!parlayExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)', 
                borderRadius: '50%', 
                width: '32px', 
                height: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                {parlayLegs.length}
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', letterSpacing: '1px', color: '#a855f7' }}>
                  PARLAY BUILDER
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666' }}>
                  {parlayLegs.length} leg{parlayLegs.length !== 1 ? 's' : ''} • Tap to {parlayExpanded ? 'collapse' : 'expand'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {parlayLegs.length >= 2 && !parlayExpanded && (
                <button
                  onClick={(e) => { e.stopPropagation(); calculateParlay(); setParlayExpanded(true); }}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '1px',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  CALCULATE
                </button>
              )}
              <div style={{ 
                transform: parlayExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'transform 0.3s',
                fontSize: '20px',
                color: '#666'
              }}>
                ▲
              </div>
            </div>
          </div>
          
          {/* Expandable Content */}
          <div style={styles.parlayContent}>
            {/* Legs List */}
            {parlayLegs.map((leg, index) => (
              <div key={leg.id} style={styles.parlayLeg}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontFamily: "'Space Mono', monospace", 
                    fontSize: '12px', 
                    color: '#666',
                    width: '20px'
                  }}>
                    #{index + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {leg.player} <span style={{ color: leg.direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{leg.direction}</span> {leg.line} {leg.stat}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666' }}>
                      vs {leg.opponent} • {leg.probability}% confidence
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFromParlay(leg.id)}
                  style={{
                    background: 'rgba(255,68,68,0.1)',
                    border: '1px solid rgba(255,68,68,0.3)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: '#ff4444',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            
            {/* Parlay Result */}
            {parlayResult && (
              <div style={{ 
                padding: '20px', 
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.05))',
                borderTop: '1px solid rgba(168, 85, 247, 0.2)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#a855f7', letterSpacing: '2px', marginBottom: '8px' }}>
                    COMBINED PARLAY ODDS
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '56px', color: '#a855f7', textShadow: '0 0 40px rgba(168, 85, 247, 0.5)' }}>
                    {parlayResult.combined_probability}%
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Implied Odds: +{parlayResult.implied_odds}
                  </div>
                </div>
                
                {parlayResult.analysis && (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: '4px', 
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>
                      {parlayResult.analysis}
                    </p>
                  </div>
                )}
                
                {parlayResult.correlation_warning && (
                  <div style={{ 
                    background: 'rgba(255, 215, 0, 0.1)', 
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '4px', 
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#ffd700' }}>
                      {parlayResult.correlation_warning}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div style={{ padding: '16px 20px', display: 'flex', gap: '12px' }}>
              {parlayLegs.length >= 2 && (
                <button
                  onClick={calculateParlay}
                  disabled={parlayLoading}
                  style={{
                    flex: 1,
                    background: parlayLoading ? '#333' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '14px',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '18px',
                    letterSpacing: '2px',
                    color: parlayLoading ? '#666' : '#fff',
                    cursor: parlayLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {parlayLoading ? 'CALCULATING...' : 'CALCULATE PARLAY'}
                </button>
              )}
              
              <button
                onClick={clearParlay}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  padding: '14px 20px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '12px',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                CLEAR ALL
              </button>
            </div>
            
            {parlayLegs.length < 2 && (
              <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>
                  Add at least 2 legs to calculate parlay odds
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
