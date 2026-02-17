const API_URL = 'https://stat-prophet.vercel.app/api';

const featuredPlayerNames = [
  'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Dončić', 
  'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokić',
  'Anthony Edwards', 'Shai Gilgeous-Alexander', 'Ja Morant', 'Victor Wembanyama'
];

const statCategories = ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks'];

function App() {
  const [step, setStep] = React.useState(1);
  const [sport, setSport] = React.useState('');
  const [player, setPlayer] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stat, setStat] = React.useState('');
  const [opponent, setOpponent] = React.useState(null);
  const [direction, setDirection] = React.useState('');
  const [line, setLine] = React.useState('');
  const [prediction, setPrediction] = React.useState(null);
  const [oddsData, setOddsData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Data from Supabase
  const [allPlayers, setAllPlayers] = React.useState([]);
  const [allTeams, setAllTeams] = React.useState([]);
  const [dataLoading, setDataLoading] = React.useState(true);

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
    setOpponent(null); setDirection(''); setLine(''); setPrediction(null); setOddsData(null); setError(null);
  };

  const goBack = () => {
    if (step === 2) { setStep(1); setSport(''); setPlayer(null); }
    else if (step === 3) { setStep(2); setStat(''); }
    else if (step === 4) { setStep(3); setOpponent(null); }
    else if (step === 5) { setStep(4); setDirection(''); }
    else if (step === 6) { setStep(5); setLine(''); setPrediction(null); setOddsData(null); }
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
          opponent: `${opponent.city} ${opponent.name}`,
          player_team: `${player.team_city} ${player.team_name}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setPrediction(data.prediction);
        setOddsData(data.odds_data);
      } else {
        setError(data.error || 'Prediction failed');
      }
    } catch (e) {
      setError('Failed to connect to API');
    }
    setLoading(false);
  };

  // Check if user's pick matches AI recommendation
  const getUserPickStatus = () => {
    if (!prediction) return null;
    const rec = prediction.recommendation;
    if (rec === 'NO BET') return 'warning';
    if (rec === direction) return 'aligned';
    return 'conflicting';
  };

  const pickStatus = getUserPickStatus();

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', fontFamily: "'Oswald', sans-serif", color: '#fff', padding: '40px 20px' },
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
    footer: { textAlign: 'center', marginTop: '80px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' },
    teamCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '14px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    loadingSpinner: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }
  };

  // Loading state
  if (dataLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.badge}>AI-POWERED ANALYTICS</div>
          <h1 style={styles.title}>STAT PROPHET</h1>
        </header>
        <div style={styles.loadingSpinner}>
          <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <p style={{ textAlign: 'center', color: '#666', fontFamily: "'Space Mono', monospace" }}>Loading players...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.badge}>AI-POWERED ANALYTICS</div>
        <h1 style={styles.title}>STAT PROPHET</h1>
        <p style={styles.subtitle}>NEXT-GEN PROP PREDICTIONS</p>
      </header>

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

          <h2 style={styles.sectionTitle}>YOUR PICK</h2>
          
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

      {/* Step 6: Enter Line & Results */}
      {step === 6 && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                  placeholder="24.5" 
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
                ANALYZE MY PICK
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontFamily: "'Space Mono', monospace", color: '#00ff88' }}>ANALYZING MARKET DATA...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Results */}
          {prediction && !loading && (
            <div>
              {/* User's Pick Card */}
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: `2px solid ${pickStatus === 'aligned' ? '#00ff88' : pickStatus === 'conflicting' ? '#ff4444' : '#ffd700'}`,
                borderRadius: '8px', 
                padding: '24px', 
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#888', letterSpacing: '2px', marginBottom: '12px' }}>
                  YOUR PICK
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#fff' }}>{line}</span>
                  <span style={{ fontSize: '18px', color: '#888' }}>{stat}</span>
                </div>
                <div style={{ 
                  marginTop: '16px', 
                  padding: '8px 16px', 
                  background: pickStatus === 'aligned' ? 'rgba(0,255,136,0.1)' : pickStatus === 'conflicting' ? 'rgba(255,68,68,0.1)' : 'rgba(255,215,0,0.1)',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  <span style={{ 
                    fontFamily: "'Space Mono', monospace", 
                    fontSize: '12px', 
                    color: pickStatus === 'aligned' ? '#00ff88' : pickStatus === 'conflicting' ? '#ff4444' : '#ffd700',
                    fontWeight: 'bold'
                  }}>
                    {pickStatus === 'aligned' ? '✓ MARKET AGREES' : pickStatus === 'conflicting' ? '✗ MARKET DISAGREES' : '⚠ CAUTION ADVISED'}
                  </span>
                </div>
              </div>

              {/* AI Recommendation Card */}
              <div style={{ 
                background: 'linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '8px', 
                padding: '32px', 
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#888', letterSpacing: '2px', marginBottom: '16px' }}>
                  AI RECOMMENDATION
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ 
                    fontFamily: "'Bebas Neue', sans-serif", 
                    fontSize: '56px', 
                    color: prediction.recommendation === 'OVER' ? '#00ff88' : prediction.recommendation === 'UNDER' ? '#ff4444' : '#ffd700'
                  }}>
                    {prediction.recommendation}
                  </span>
                  {prediction.recommendation !== 'NO BET' && (
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '56px', color: '#fff', marginLeft: '16px' }}>{line}</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>CONFIDENCE</div>
                    <div style={{ 
                      fontFamily: "'Bebas Neue', sans-serif", 
                      fontSize: '24px', 
                      color: prediction.confidence_tier === 'STRONG' ? '#00ff88' : prediction.confidence_tier === 'MODERATE' ? '#ffd700' : '#888'
                    }}>
                      {prediction.confidence_tier}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>PROBABILITY</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#fff' }}>
                      {prediction.probability}%
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>MARKET</div>
                    <div style={{ 
                      fontFamily: "'Bebas Neue', sans-serif", 
                      fontSize: '24px', 
                      color: prediction.market_alignment === 'ALIGNED' ? '#00ff88' : prediction.market_alignment === 'CONFLICTING' ? '#ff4444' : '#888'
                    }}>
                      {prediction.market_alignment}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {prediction.summary && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '4px', 
                    padding: '16px', 
                    marginTop: '16px',
                    borderLeft: '3px solid #00ff88'
                  }}>
                    <p style={{ color: '#ccc', lineHeight: 1.6, margin: 0, fontSize: '14px', textAlign: 'left' }}>
                      {prediction.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Market Data Card */}
              {oddsData && oddsData.consensus_line && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  padding: '24px', 
                  marginBottom: '20px'
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#888', letterSpacing: '2px', marginBottom: '20px', textAlign: 'center' }}>
                    LIVE MARKET DATA
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '8px' }}>CONSENSUS LINE</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#00ff88' }}>{oddsData.consensus_line}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666' }}>{oddsData.books_count} books</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '8px' }}>BEST OVER</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#00ff88' }}>{oddsData.best_over_price > 0 ? '+' : ''}{oddsData.best_over_price}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '8px' }}>BEST UNDER</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#ff4444' }}>{oddsData.best_under_price > 0 ? '+' : ''}{oddsData.best_under_price}</div>
                    </div>
                  </div>

                  {/* Lines by Book */}
                  {oddsData.lines_by_book && Object.keys(oddsData.lines_by_book).length > 0 && (
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '12px', textAlign: 'center' }}>LINES BY BOOK</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        {Object.entries(oddsData.lines_by_book).map(([book, bookLine]) => (
                          <div key={book} style={{ 
                            padding: '8px 12px', 
                            background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{book}: </span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>{bookLine}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Factors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {prediction.key_factors_for && prediction.key_factors_for.length > 0 && (
                  <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '20px' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00ff88', marginBottom: '12px', letterSpacing: '1px' }}>▲ SUPPORTING FACTORS</div>
                    {prediction.key_factors_for.map((f, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #00ff88' }}>{f}</div>
                    ))}
                  </div>
                )}
                {prediction.key_factors_against && prediction.key_factors_against.length > 0 && (
                  <div style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px', padding: '20px' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#ff4444', marginBottom: '12px', letterSpacing: '1px' }}>▼ RISK FACTORS</div>
                    {prediction.key_factors_against.map((r, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #ff4444' }}>{r}</div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={reset} 
                style={{ width: '100%', background: 'transparent', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '16px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#888', transition: 'all 0.3s' }} 
                onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88';}} 
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#888';}}
              >
                NEW PREDICTION
              </button>
            </div>
          )}
        </div>
      )}

      <footer style={styles.footer}>POWERED BY CLAUDE AI & ODDS API • FOR ENTERTAINMENT PURPOSES ONLY</footer>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
