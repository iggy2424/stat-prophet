const API_URL = 'https://stat-prophet.vercel.app/api';

const featuredPlayerNames = [
  'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Dončić', 
  'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokić',
  'Anthony Edwards', 'Shai Gilgeous-Alexander', 'Ja Morant', 'Victor Wembanyama'
];

const statCategories = ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks'];

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
        <span style={navStyles.logoText}>STAT PROPHET</span>
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
          STAT PROPHET
        </h1>
        
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '14px',
          color: '#666',
          letterSpacing: '2px',
          marginBottom: '60px'
        }}>
          NEXT-GEN NBA PROP PREDICTIONS
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
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = React.useState('home');
  const [step, setStep] = React.useState(1);
  const [sport, setSport] = React.useState('');
  const [player, setPlayer] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stat, setStat] = React.useState('');
  const [opponent, setOpponent] = React.useState(null);
  const [direction, setDirection] = React.useState('');
  const [line, setLine] = React.useState('');
  const [prediction, setPrediction] = React.useState(null);
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

  // Get featured players from loaded data
  const featuredPlayers = allPlayers.filter(p => featuredPlayerNames.includes(p.name));
  
  // Filter players based on search
  const filteredPlayers = searchQuery.length > 0
    ? allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 12)
    : featuredPlayers;

  // Get available opponents (exclude player's team)
  const availableOpponents = player 
    ? allTeams.filter(t => t.id !== player.team_id)
    : allTeams;

  const handleSportSelect = (s) => { setSport(s); setStep(2); };
  const handlePlayerSelect = (p) => { setPlayer(p); setSearchQuery(''); setStep(3); };
  const handleStatSelect = (s) => { setStat(s); setStep(4); };
  const handleOpponentSelect = (t) => { setOpponent(t); setStep(5); };
  const handleDirectionSelect = (d) => { setDirection(d); setStep(6); };

  const reset = () => {
    setStep(1); setSport(''); setPlayer(null); setSearchQuery(''); setStat(''); 
    setOpponent(null); setDirection(''); setLine(''); setPrediction(null); setError(null);
  };

  const goBack = () => {
    if (step === 2) { setStep(1); setSport(''); setPlayer(null); }
    else if (step === 3) { setStep(2); setStat(''); }
    else if (step === 4) { setStep(3); setOpponent(null); }
    else if (step === 5) { setStep(4); setDirection(''); }
    else if (step === 6) { setStep(5); setLine(''); setPrediction(null); }
  };

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
          line: parseFloat(line),
          direction: direction,
          opponent: `${opponent.city} ${opponent.name}`
        })
      });
      const data = await res.json();
      if (data.success) setPrediction(data.prediction);
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

        <div style={styles.progress}>
          {[1,2,3,4,5,6].map(s => (
            <div key={s} style={{ width: s <= step ? '40px' : '10px', height: '4px', background: s <= step ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.4s' }} />
          ))}
        </div>

        {/* Step 1: Sport Selection */}
        {step === 1 && (
          <div>
            <h2 style={styles.sectionTitle}>SELECT YOUR SPORT</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div 
                onClick={() => handleSportSelect('NBA')}
                style={styles.sportCard}
                onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,255,136,0.2)';}}
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none';}}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏀</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '2px' }}>NBA</div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#444', marginTop: '40px' }}>More sports coming soon...</p>
        </div>
      )}

      {/* Step 2: Player Selection */}
      {step === 2 && (
        <div>
          <button style={styles.backBtn} onClick={goBack}>← BACK TO SPORTS</button>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '36px' }}>🏀</span>
          </div>
          
          <h2 style={styles.sectionTitle}>SELECT PLAYER</h2>
          
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search 300+ NBA players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              onFocus={(e) => e.target.style.borderColor = '#00ff88'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00ff88', letterSpacing: '2px' }}>
              {searchQuery ? `${allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length} PLAYERS FOUND` : 'FEATURED PLAYERS'}
            </span>
          </div>
          
          <div style={styles.grid}>
            {filteredPlayers.map(p => (
              <div 
                key={p.id} 
                onClick={() => handlePlayerSelect(p)} 
                style={styles.card} 
                onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.background = 'rgba(0,255,136,0.05)';}} 
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}
              >
                <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{p.team_city} {p.team_name}</div>
              </div>
            ))}
          </div>

          {searchQuery && filteredPlayers.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#888' }}>
              No players found for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Step 3: Stat Selection */}
      {step === 3 && (
        <div>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-block', padding: '12px 32px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#00ff88' }}>{player.name}</span>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{player.team_city} {player.team_name}</div>
            </div>
          </div>
          <h2 style={styles.sectionTitle}>SELECT STAT</h2>
          <div style={{...styles.grid, maxWidth: '700px'}}>
            {statCategories.map(s => (
              <div 
                key={s} 
                onClick={() => handleStatSelect(s)} 
                style={{...styles.card, padding: '28px'}} 
                onMouseOver={e => {e.currentTarget.style.borderColor = '#ffd700'; e.currentTarget.style.background = 'rgba(255,215,0,0.05)';}} 
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}
              >
                <div style={{ fontSize: '18px' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Opponent Selection */}
      {step === 4 && (
        <div>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', gap: '16px', alignItems: 'center', padding: '12px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#00ff88' }}>{player.name}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '18px', color: '#ffd700' }}>{stat}</span>
            </div>
          </div>

          <h2 style={styles.sectionTitle}>SELECT OPPONENT</h2>
          <p style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666', marginBottom: '30px' }}>
            Who is {player.name} playing against?
          </p>
          
          <div style={{...styles.grid, maxWidth: '900px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'}}>
            {availableOpponents.map(t => (
              <div 
                key={t.id} 
                onClick={() => handleOpponentSelect(t)} 
                style={styles.teamCard} 
                onMouseOver={e => {e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.background = 'rgba(255,107,53,0.05)';}} 
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}
              >
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{t.city}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#ff6b35' }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Over/Under Selection */}
      {step === 5 && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center', padding: '12px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', color: '#00ff88' }}>{player.name}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '16px', color: '#ffd700' }}>{stat}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '14px', color: '#ff6b35' }}>vs {opponent.name}</span>
            </div>
          </div>

          <h2 style={styles.sectionTitle}>CHOOSE DIRECTION</h2>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
            <div 
              onClick={() => handleDirectionSelect('OVER')}
              style={{...styles.directionBtn, borderColor: 'rgba(0,255,136,0.3)'}}
              onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.background = 'rgba(0,255,136,0.1)';}}
              onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(0,255,136,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#00ff88', marginBottom: '8px' }}>OVER</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>Player exceeds the line</div>
            </div>
            
            <div 
              onClick={() => handleDirectionSelect('UNDER')}
              style={{...styles.directionBtn, borderColor: 'rgba(255,68,68,0.3)'}}
              onMouseOver={e => {e.currentTarget.style.borderColor = '#ff4444'; e.currentTarget.style.background = 'rgba(255,68,68,0.1)';}}
              onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,68,68,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#ff4444', marginBottom: '8px' }}>UNDER</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>Player stays below the line</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Enter Line Value */}
      {step === 6 && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          
          {/* Summary Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center', padding: '14px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#00ff88' }}>{player.name}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '14px', color: '#ffd700' }}>{stat}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '12px', color: '#ff6b35' }}>vs {opponent.name}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
            </div>
          </div>

          {!prediction && !loading && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={styles.sectionTitle}>ENTER LINE VALUE</h2>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                <input 
                  type="number" 
                  step="0.5"
                  value={line} 
                  onChange={e => setLine(e.target.value)} 
                  placeholder="25.5" 
                  style={styles.lineInput}
                  onFocus={(e) => e.target.style.borderColor = '#00ff88'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <span style={{ fontSize: '16px', color: '#888' }}>{stat}</span>
              </div>

              {error && (
                <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '4px', padding: '16px', marginBottom: '24px', color: '#ff4444', fontFamily: "'Space Mono', monospace", fontSize: '12px' }}>
                  {error}
                </div>
              )}

              <button 
                onClick={getPrediction} 
                disabled={!line} 
                style={{...styles.primaryBtn, ...(line ? {} : styles.disabledBtn)}}
              >
                GET PREDICTION
              </button>
              
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#444', marginTop: '24px' }}>
                What are the odds {player.name} goes {direction} {line || '___'} {stat.toLowerCase()} vs {opponent.name}?
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontFamily: "'Space Mono', monospace", color: '#00ff88' }}>ANALYZING WITH AI...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
              </div>

              {prediction.summary && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '24px', marginBottom: '24px' }}>
                  <p style={{ color: '#ccc', lineHeight: 1.6, margin: 0, fontSize: '15px' }}>"{prediction.summary}"</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {prediction.factors && prediction.factors.length > 0 && (
                  <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '20px' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00ff88', marginBottom: '12px', letterSpacing: '1px' }}>▲ SUPPORTING FACTORS</div>
                    {prediction.factors.map((f, i) => <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #00ff88' }}>{f}</div>)}
                  </div>
                )}
                {prediction.risks && prediction.risks.length > 0 && (
                  <div style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px', padding: '20px' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#ff4444', marginBottom: '12px', letterSpacing: '1px' }}>▼ RISK FACTORS</div>
                    {prediction.risks.map((r, i) => <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #ff4444' }}>{r}</div>)}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button 
                  onClick={reset} 
                  style={{ flex: 1, background: 'transparent', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '16px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#888', transition: 'all 0.3s' }} 
                  onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88';}} 
                  onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#888';}}
                >
                  NEW PREDICTION
                </button>
                
                {!isInParlay && parlayLegs.length < 6 && (
                  <button 
                    onClick={addToParlay}
                    style={styles.addToParlayBtn}
                    onMouseOver={e => {e.currentTarget.style.background = 'rgba(138, 43, 226, 0.3)'; e.currentTarget.style.borderColor = '#a855f7';}}
                    onMouseOut={e => {e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)'; e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.5)';}}
                  >
                    + ADD TO PARLAY
                  </button>
                )}
                
                {isInParlay && (
                  <div style={{ 
                    flex: 'none',
                    padding: '16px 24px', 
                    background: 'rgba(138, 43, 226, 0.1)', 
                    border: '1px solid rgba(138, 43, 226, 0.3)', 
                    borderRadius: '4px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '12px',
                    color: '#a855f7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    ✓ IN PARLAY
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
