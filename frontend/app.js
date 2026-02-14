const API_URL = 'https://stat-prophet.vercel.app/api';

const featuredPlayers = [
  'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Dončić', 
  'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokić',
  'Anthony Edwards', 'Shai Gilgeous-Alexander', 'Ja Morant', 'Damian Lillard'
];

const statCategories = ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks'];

function App() {
  const [step, setStep] = React.useState(1);
  const [player, setPlayer] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stat, setStat] = React.useState('');
  const [direction, setDirection] = React.useState('');
  const [line, setLine] = React.useState('');
  const [prediction, setPrediction] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const filteredPlayers = featuredPlayers.filter(p => 
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayerSelect = (p) => { 
    setPlayer(p); 
    setSearchQuery('');
    setStep(2); 
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setPlayer(searchQuery.trim());
      setSearchQuery('');
      setStep(2);
    }
  };

  const handleStatSelect = (s) => { setStat(s); setStep(3); };
  const handleDirectionSelect = (d) => { setDirection(d); setStep(4); };

  const reset = () => {
    setStep(1); setPlayer(''); setSearchQuery(''); setStat(''); 
    setDirection(''); setLine(''); setPrediction(null); setError(null);
  };

  const goBack = () => {
    if (step === 2) { setStep(1); setPlayer(''); }
    else if (step === 3) { setStep(2); setStat(''); }
    else if (step === 4) { setStep(3); setDirection(''); }
  };

  const getPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          player_name: player, 
          stat_type: stat.toLowerCase(), 
          line: parseFloat(line),
          direction: direction
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

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', fontFamily: "'Oswald', sans-serif", color: '#fff', padding: '40px 20px' },
    header: { textAlign: 'center', marginBottom: '60px' },
    badge: { display: 'inline-block', padding: '8px 24px', background: 'linear-gradient(90deg, #00ff88, #00cc6a)', color: '#0a0a0f', fontSize: '12px', fontFamily: "'Space Mono', monospace", fontWeight: '700', letterSpacing: '3px', marginBottom: '20px' },
    title: { fontSize: 'clamp(48px, 10vw, 80px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '4px', background: 'linear-gradient(180deg, #fff 0%, #888 100)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#666', letterSpacing: '2px' },
    progress: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '50px' },
    sectionTitle: { textAlign: 'center', fontSize: '24px', fontWeight: '300', letterSpacing: '4px', marginBottom: '40px', color: '#888' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    backBtn: { background: 'none', border: 'none', color: '#00ff88', fontFamily: "'Space Mono', monospace", fontSize: '12px', cursor: 'pointer', marginBottom: '30px' },
    searchContainer: { maxWidth: '500px', margin: '0 auto 40px' },
    searchInput: { width: '100%', padding: '16px 24px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontFamily: "'Oswald', sans-serif", fontSize: '18px', outline: 'none', transition: 'border-color 0.3s' },
    lineInput: { width: '120px', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '24px', textAlign: 'center', outline: 'none' },
    primaryBtn: { background: 'linear-gradient(90deg, #00ff88, #00cc6a)', border: 'none', borderRadius: '4px', padding: '20px 60px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '3px', color: '#0a0a0f' },
    disabledBtn: { background: '#333', color: '#666', cursor: 'not-allowed' },
    directionBtn: { flex: 1, padding: '30px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s', background: 'rgba(255,255,255,0.03)' },
    resultCard: { background: 'linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '50px', marginBottom: '24px', textAlign: 'center' },
    footer: { textAlign: 'center', marginTop: '80px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.badge}>AI-POWERED ANALYTICS</div>
        <h1 style={styles.title}>STAT PROPHET</h1>
        <p style={styles.subtitle}>NEXT-GEN PROP PREDICTIONS</p>
      </header>

      <div style={styles.progress}>
        {[1,2,3,4].map(s => (
          <div key={s} style={{ width: s <= step ? '60px' : '12px', height: '4px', background: s <= step ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.4s' }} />
        ))}
      </div>

      {/* Step 1: Player Selection */}
      {step === 1 && (
        <div>
          <h2 style={styles.sectionTitle}>SELECT PLAYER</h2>
          
          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search any player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => e.target.style.borderColor = '#00ff88'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </form>
            {searchQuery && (
              <div style={{ marginTop: '8px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666' }}>
                Press Enter to search for "{searchQuery}"
              </div>
            )}
          </div>

          {/* Featured Players */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#666', letterSpacing: '2px' }}>
              {searchQuery ? 'MATCHING PLAYERS' : 'FEATURED PLAYERS'}
            </span>
          </div>
          
          <div style={styles.grid}>
            {(searchQuery ? filteredPlayers : featuredPlayers).map(p => (
              <div 
                key={p} 
                onClick={() => handlePlayerSelect(p)} 
                style={styles.card} 
                onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.background = 'rgba(0,255,136,0.05)';}} 
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}
              >
                <div style={{ fontSize: '16px', fontWeight: '500' }}>{p}</div>
              </div>
            ))}
          </div>

          {searchQuery && filteredPlayers.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>
              No featured players match. Press Enter to search for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Step 2: Stat Selection */}
      {step === 2 && (
        <div>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-block', padding: '12px 32px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#00ff88' }}>{player}</span>
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

      {/* Step 3: Over/Under Selection */}
      {step === 3 && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', gap: '16px', alignItems: 'center', padding: '12px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#00ff88' }}>{player}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '18px', color: '#ffd700' }}>{stat}</span>
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

      {/* Step 4: Enter Line Value */}
      {step === 4 && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button style={styles.backBtn} onClick={goBack}>← BACK</button>
          
          {/* Summary Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', gap: '16px', alignItems: 'center', padding: '16px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: '#00ff88' }}>{player}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontSize: '16px', color: '#ffd700' }}>{stat}</span>
              <span style={{ color: '#444' }}>|</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
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
                What are the odds {player} goes {direction} {line || '___'} {stat.toLowerCase()} in their next game?
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#666', letterSpacing: '2px', marginBottom: '24px' }}>
                  PROBABILITY OF {player.toUpperCase()} GOING
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: direction === 'OVER' ? '#00ff88' : '#ff4444' }}>{direction}</span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: '#fff', margin: '0 16px' }}>{line}</span>
                  <span style={{ fontSize: '24px', color: '#888' }}>{stat}</span>
                </div>

                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '120px', lineHeight: 1, color: prediction.probability >= 60 ? '#00ff88' : prediction.probability >= 45 ? '#ffd700' : '#ff4444', textShadow: '0 0 60px currentColor' }}>
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

      <footer style={styles.footer}>POWERED BY CLAUDE AI • FOR ENTERTAINMENT PURPOSES ONLY</footer>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
