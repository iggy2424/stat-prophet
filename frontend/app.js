const API_URL = 'https://stat-prophet.vercel.app/api';

const featuredPlayerNames = [
  'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Dončić', 
  'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokić',
  'Anthony Edwards', 'Shai Gilgeous-Alexander', 'Ja Morant', 'Victor Wembanyama'
];

const statCategories = ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks'];

// Navigation Component
function Navbar({ currentPage, setCurrentPage }) {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '70px',
      background: 'rgba(5, 5, 8, 0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      zIndex: 1000
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentPage('home')}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          🏀
        </div>
        <span style={{
          fontSize: '20px',
          fontWeight: '700',
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          STAT PROPHET
        </span>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {[
          { id: 'home', label: 'Home' },
          { id: 'analyzer', label: 'Prop Analyzer' },
          { id: 'datalab', label: 'Data Lab' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={{
              background: currentPage === item.id ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
              border: currentPage === item.id ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid transparent',
              borderRadius: '8px',
              padding: '10px 20px',
              color: currentPage === item.id ? '#00ff88' : '#888',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
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

      {/* CTA Button */}
      <button style={{
        background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 24px',
        color: '#050508',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        Get Started
      </button>
    </nav>
  );
}

// Coming Soon Page Component
function ComingSoon({ title }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '120px 20px 40px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 255, 136, 0.05) 100%)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        marginBottom: '24px',
        border: '1px solid rgba(0, 255, 136, 0.2)'
      }}>
        🚧
      </div>
      <h1 style={{
        fontSize: '32px',
        fontWeight: '700',
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        {title}
      </h1>
      <p style={{ color: '#666', fontSize: '16px' }}>Coming Soon</p>
    </div>
  );
}

// Main App Component
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
  
  const [allPlayers, setAllPlayers] = React.useState([]);
  const [allTeams, setAllTeams] = React.useState([]);
  const [dataLoading, setDataLoading] = React.useState(true);

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

  const featuredPlayers = allPlayers.filter(p => featuredPlayerNames.includes(p.name));
  const filteredPlayers = searchQuery.length > 0
    ? allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 12)
    : featuredPlayers;
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

  // Styles
  const styles = {
    pageContainer: {
      minHeight: '100vh',
      paddingTop: '70px'
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px'
    },
    sectionLabel: {
      display: 'inline-block',
      padding: '6px 12px',
      background: 'rgba(0, 255, 136, 0.1)',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#00ff88',
      letterSpacing: '1px',
      marginBottom: '16px'
    },
    title: {
      fontSize: 'clamp(32px, 5vw, 48px)',
      fontWeight: '800',
      lineHeight: 1.1,
      marginBottom: '16px',
      background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    subtitle: {
      fontSize: '16px',
      color: '#666',
      marginBottom: '40px',
      maxWidth: '500px'
    },
    progress: {
      display: 'flex',
      gap: '8px',
      marginBottom: '40px'
    },
    progressDot: (active) => ({
      width: active ? '32px' : '8px',
      height: '8px',
      borderRadius: '4px',
      background: active ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease'
    }),
    card: {
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '12px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'center'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '12px'
    },
    backBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: 'transparent',
      border: 'none',
      color: '#666',
      fontSize: '14px',
      cursor: 'pointer',
      marginBottom: '24px',
      padding: '8px 0',
      transition: 'color 0.2s'
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
      border: 'none',
      borderRadius: '10px',
      padding: '16px 48px',
      color: '#050508',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    input: {
      width: '120px',
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '24px',
      fontWeight: '600',
      textAlign: 'center',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    searchInput: {
      width: '100%',
      maxWidth: '400px',
      padding: '14px 20px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '15px',
      outline: 'none',
      transition: 'all 0.2s'
    },
    resultCard: {
      background: 'linear-gradient(145deg, rgba(0, 255, 136, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      borderRadius: '16px',
      padding: '40px',
      textAlign: 'center',
      marginBottom: '24px'
    },
    badge: {
      display: 'inline-block',
      padding: '6px 14px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      fontSize: '13px',
      color: '#888',
      marginBottom: '24px'
    }
  };

  // Loading State
  if (dataLoading) {
    return (
      <>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div style={{...styles.pageContainer, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(0, 255, 136, 0.2)',
              borderTopColor: '#00ff88',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Loading players...</p>
          </div>
        </div>
      </>
    );
  }

  // Render other pages
  if (currentPage === 'analyzer') {
    return (
      <>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <ComingSoon title="Prop Analyzer" />
      </>
    );
  }

  if (currentPage === 'datalab') {
    return (
      <>
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <ComingSoon title="Data Lab" />
      </>
    );
  }

  // Home Page (Prediction Flow)
  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div style={styles.pageContainer}>
        <div style={styles.container}>
          
          {/* Progress Bar */}
          <div style={styles.progress}>
            {[1,2,3,4,5,6].map(s => (
              <div key={s} style={styles.progressDot(s <= step)} />
            ))}
          </div>

          {/* Step 1: Sport Selection */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <div style={styles.sectionLabel}>STEP 1</div>
              <h1 style={styles.title}>Select Your Sport</h1>
              <p style={styles.subtitle}>Choose a sport to start building your prediction</p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div 
                  onClick={() => handleSportSelect('NBA')}
                  style={{...styles.card, padding: '32px 48px', borderColor: 'rgba(0, 255, 136, 0.2)'}}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#00ff88';
                    e.currentTarget.style.background = 'rgba(0, 255, 136, 0.05)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏀</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>NBA</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Basketball</div>
                </div>

                <div style={{...styles.card, padding: '32px 48px', opacity: 0.4, cursor: 'not-allowed'}}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏈</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>NFL</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Coming Soon</div>
                </div>

                <div style={{...styles.card, padding: '32px 48px', opacity: 0.4, cursor: 'not-allowed'}}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚾</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>MLB</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Coming Soon</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Player Selection */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <button style={styles.backBtn} onClick={goBack} onMouseOver={e => e.currentTarget.style.color = '#00ff88'} onMouseOut={e => e.currentTarget.style.color = '#666'}>
                ← Back
              </button>
              
              <div style={styles.sectionLabel}>STEP 2</div>
              <h1 style={styles.title}>Select Player</h1>
              <p style={styles.subtitle}>Search from 300+ NBA players</p>

              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => e.target.style.borderColor = '#00ff88'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />

              <div style={{ marginTop: '12px', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', color: '#00ff88' }}>
                  {searchQuery ? `${allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length} players found` : 'Featured Players'}
                </span>
              </div>

              <div style={styles.grid}>
                {filteredPlayers.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handlePlayerSelect(p)} 
                    style={styles.card}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#00ff88';
                      e.currentTarget.style.background = 'rgba(0, 255, 136, 0.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{p.team_city} {p.team_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Stat Selection */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <button style={styles.backBtn} onClick={goBack} onMouseOver={e => e.currentTarget.style.color = '#00ff88'} onMouseOut={e => e.currentTarget.style.color = '#666'}>
                ← Back
              </button>

              <div style={styles.badge}>{player.name} • {player.team_name}</div>
              
              <div style={styles.sectionLabel}>STEP 3</div>
              <h1 style={styles.title}>Select Stat</h1>
              <p style={styles.subtitle}>Choose the stat category for your prediction</p>

              <div style={{...styles.grid, maxWidth: '700px'}}>
                {statCategories.map(s => (
                  <div 
                    key={s} 
                    onClick={() => handleStatSelect(s)} 
                    style={{...styles.card, padding: '24px'}}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#ffd700';
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Opponent Selection */}
          {step === 4 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <button style={styles.backBtn} onClick={goBack} onMouseOver={e => e.currentTarget.style.color = '#00ff88'} onMouseOut={e => e.currentTarget.style.color = '#666'}>
                ← Back
              </button>

              <div style={styles.badge}>{player.name} • {stat}</div>
              
              <div style={styles.sectionLabel}>STEP 4</div>
              <h1 style={styles.title}>Select Opponent</h1>
              <p style={styles.subtitle}>Who is {player.name} playing against?</p>

              <div style={{...styles.grid, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'}}>
                {availableOpponents.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpponentSelect(t)} 
                    style={{...styles.card, padding: '16px'}}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#ff6b35';
                      e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#888' }}>{t.city}</div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#ff6b35' }}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Direction Selection */}
          {step === 5 && (
            <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '600px' }}>
              <button style={styles.backBtn} onClick={goBack} onMouseOver={e => e.currentTarget.style.color = '#00ff88'} onMouseOut={e => e.currentTarget.style.color = '#666'}>
                ← Back
              </button>

              <div style={styles.badge}>{player.name} • {stat} • vs {opponent.name}</div>
              
              <div style={styles.sectionLabel}>STEP 5</div>
              <h1 style={styles.title}>Choose Direction</h1>
              <p style={styles.subtitle}>Will the player go over or under the line?</p>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div 
                  onClick={() => handleDirectionSelect('OVER')}
                  style={{
                    flex: 1,
                    padding: '32px',
                    background: 'rgba(0, 255, 136, 0.05)',
                    border: '2px solid rgba(0, 255, 136, 0.2)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#00ff88';
                    e.currentTarget.style.background = 'rgba(0, 255, 136, 0.1)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.2)';
                    e.currentTarget.style.background = 'rgba(0, 255, 136, 0.05)';
                  }}
                >
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#00ff88', marginBottom: '8px' }}>OVER</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>Player exceeds the line</div>
                </div>

                <div 
                  onClick={() => handleDirectionSelect('UNDER')}
                  style={{
                    flex: 1,
                    padding: '32px',
                    background: 'rgba(255, 68, 68, 0.05)',
                    border: '2px solid rgba(255, 68, 68, 0.2)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#ff4444';
                    e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 68, 68, 0.2)';
                    e.currentTarget.style.background = 'rgba(255, 68, 68, 0.05)';
                  }}
                >
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#ff4444', marginBottom: '8px' }}>UNDER</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>Player stays below</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Line Input & Results */}
          {step === 6 && (
            <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '700px' }}>
              <button style={styles.backBtn} onClick={goBack} onMouseOver={e => e.currentTarget.style.color = '#00ff88'} onMouseOut={e => e.currentTarget.style.color = '#666'}>
                ← Back
              </button>

              <div style={styles.badge}>{player.name} • {stat} • vs {opponent.name} • {direction}</div>

              {!prediction && !loading && (
                <>
                  <div style={styles.sectionLabel}>STEP 6</div>
                  <h1 style={styles.title}>Enter Line Value</h1>
                  <p style={styles.subtitle}>Set the line for your {direction.toLowerCase()} prediction</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                    <input 
                      type="number" 
                      step="0.5"
                      value={line} 
                      onChange={e => setLine(e.target.value)} 
                      placeholder="25.5" 
                      style={styles.input}
                      onFocus={(e) => e.target.style.borderColor = '#00ff88'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                    <span style={{ fontSize: '16px', color: '#666' }}>{stat}</span>
                  </div>

                  {error && (
                    <div style={{ 
                      background: 'rgba(255, 68, 68, 0.1)', 
                      border: '1px solid rgba(255, 68, 68, 0.3)', 
                      borderRadius: '8px', 
                      padding: '12px 16px', 
                      marginBottom: '20px',
                      color: '#ff4444',
                      fontSize: '14px'
                    }}>
                      {error}
                    </div>
                  )}

                  <button 
                    onClick={getPrediction} 
                    disabled={!line} 
                    style={{
                      ...styles.primaryBtn,
                      opacity: line ? 1 : 0.5,
                      cursor: line ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Get Prediction
                  </button>
                </>
              )}

              {/* Loading */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid rgba(0, 255, 136, 0.2)',
                    borderTopColor: '#00ff88',
                    borderRadius: '50%',
                    margin: '0 auto 20px',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ color: '#00ff88', fontSize: '14px' }}>Analyzing with AI...</p>
                </div>
              )}

              {/* Results */}
              {prediction && !loading && (
                <div>
                  <div style={styles.resultCard}>
                    <div style={{ fontSize: '13px', color: '#888', letterSpacing: '1px', marginBottom: '8px' }}>
                      {player.name.toUpperCase()} VS {opponent.name.toUpperCase()}
                    </div>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <span style={{ fontSize: '36px', fontWeight: '800', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                      <span style={{ fontSize: '36px', fontWeight: '800', color: '#fff', margin: '0 12px' }}>{line}</span>
                      <span style={{ fontSize: '18px', color: '#888' }}>{stat}</span>
                    </div>

                    <div style={{ 
                      fontSize: '80px', 
                      fontWeight: '800', 
                      lineHeight: 1,
                      color: prediction.probability >= 60 ? '#00ff88' : prediction.probability >= 45 ? '#ffd700' : '#ff4444',
                      textShadow: '0 0 60px currentColor',
                      marginBottom: '16px'
                    }}>
                      {prediction.probability}%
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#888' }}>
                      Confidence: <span style={{ 
                        color: prediction.confidence === 'high' ? '#00ff88' : prediction.confidence === 'medium' ? '#ffd700' : '#ff4444',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>{prediction.confidence}</span>
                    </div>
                  </div>

                  {prediction.summary && (
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid rgba(255, 255, 255, 0.06)', 
                      borderRadius: '12px', 
                      padding: '20px', 
                      marginBottom: '20px' 
                    }}>
                      <p style={{ color: '#ccc', lineHeight: 1.6, fontSize: '15px', margin: 0 }}>"{prediction.summary}"</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    {prediction.factors && prediction.factors.length > 0 && (
                      <div style={{ 
                        background: 'rgba(0, 255, 136, 0.05)', 
                        border: '1px solid rgba(0, 255, 136, 0.15)', 
                        borderRadius: '12px', 
                        padding: '20px' 
                      }}>
                        <div style={{ fontSize: '12px', color: '#00ff88', fontWeight: '600', marginBottom: '12px', letterSpacing: '0.5px' }}>SUPPORTING FACTORS</div>
                        {prediction.factors.map((f, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #00ff88' }}>{f}</div>
                        ))}
                      </div>
                    )}
                    {prediction.risks && prediction.risks.length > 0 && (
                      <div style={{ 
                        background: 'rgba(255, 68, 68, 0.05)', 
                        border: '1px solid rgba(255, 68, 68, 0.15)', 
                        borderRadius: '12px', 
                        padding: '20px' 
                      }}>
                        <div style={{ fontSize: '12px', color: '#ff4444', fontWeight: '600', marginBottom: '12px', letterSpacing: '0.5px' }}>RISK FACTORS</div>
                        {prediction.risks.map((r, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #ff4444' }}>{r}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={reset} 
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#888',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#00ff88';
                      e.currentTarget.style.color = '#00ff88';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#888';
                    }}
                  >
                    New Prediction
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '40px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          marginTop: '60px'
        }}>
          <p style={{ color: '#444', fontSize: '12px' }}>
            Powered by Claude AI • For entertainment purposes only
          </p>
        </footer>
      </div>
    </>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
