const API_URL = 'https://stat-prophet.vercel.app/api';

const sportsData = {
  'NBA': {
    icon: '🏀',
    players: ['LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Dončić', 'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokić', 'Anthony Edwards', 'Shai Gilgeous-Alexander'],
    stats: ['Points', 'Rebounds', 'Assists', 'Three-Pointers Made', 'Steals', 'Blocks', 'Points + Rebounds + Assists']
  }
};

function App() {
  const [step, setStep] = React.useState(1);
  const [sport, setSport] = React.useState('');
  const [player, setPlayer] = React.useState('');
  const [stat, setStat] = React.useState('');
  const [statLine, setStatLine] = React.useState('');
  const [prediction, setPrediction] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleSportSelect = (s) => { setSport(s); setStep(2); };
  const handlePlayerSelect = (p) => { setPlayer(p); setStep(3); };
  const handleStatSelect = (s) => { setStat(s); setStep(4); };

  const reset = () => {
    setStep(1); setSport(''); setPlayer(''); setStat(''); setStatLine('');
    setPrediction(null); setError(null);
  };

  const getPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: player, stat_type: stat.toLowerCase(), line: parseFloat(statLine) })
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
    title: { fontSize: 'clamp(48px, 10vw, 80px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '4px', background: 'linear-gradient(180deg, #fff 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#666', letterSpacing: '2px' },
    progress: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '50px' },
    sectionTitle: { textAlign: 'center', fontSize: '24px', fontWeight: '300', letterSpacing: '4px', marginBottom: '40px', color: '#888' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '24px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    backBtn: { background: 'none', border: 'none', color: '#00ff88', fontFamily: "'Space Mono', monospace", fontSize: '12px', cursor: 'pointer', marginBottom: '30px' },
    input: { width: '150px', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '20px', textAlign: 'center', outline: 'none' },
    primaryBtn: { background: 'linear-gradient(90deg, #00ff88, #00cc6a)', border: 'none', borderRadius: '4px', padding: '20px 60px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '3px', color: '#0a0a0f' },
    disabledBtn: { background: '#333', color: '#666', cursor: 'not-allowed' },
    resultCard: { background: 'linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '40px', marginBottom: '24px', textAlign: 'center' },
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

      {step === 1 && (
        <div>
          <h2 style={styles.sectionTitle}>SELECT YOUR SPORT</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div onClick={() => handleSportSelect('NBA')} style={{...styles.card, padding: '40px 60px'}} onMouseOver={e => e.currentTarget.style.borderColor = '#00ff88'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏀</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '2px' }}>NBA</div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#444', marginTop: '40px' }}>More sports coming soon...</p>
        </div>
      )}

      {step === 2 && (
        <div>
          <button style={styles.backBtn} onClick={() => setStep(1)}>← BACK</button>
          <h2 style={styles.sectionTitle}>SELECT PLAYER</h2>
          <div style={styles.grid}>
            {sportsData[sport].players.map(p => (
              <div key={p} onClick={() => handlePlayerSelect(p)} style={styles.card} onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.background = 'rgba(0,255,136,0.05)';}} onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}>
                <div style={{ fontSize: '18px', fontWeight: '500' }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <button style={styles.backBtn} onClick={() => setStep(2)}>← BACK</button>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-block', padding: '12px 32px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#00ff88' }}>{player}</span>
            </div>
          </div>
          <h2 style={styles.sectionTitle}>SELECT STAT</h2>
          <div style={styles.grid}>
            {sportsData[sport].stats.map(s => (
              <div key={s} onClick={() => handleStatSelect(s)} style={styles.card} onMouseOver={e => {e.currentTarget.style.borderColor = '#ffd700'; e.currentTarget.style.background = 'rgba(255,215,0,0.05)';}} onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)';}}>
                <div style={{ fontSize: '16px' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button style={styles.backBtn} onClick={() => setStep(3)}>← BACK</button>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '24px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>PLAYER</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#00ff88' }}>{player}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>STAT</div>
              <div style={{ fontSize: '20px', color: '#ffd700' }}>{stat}</div>
            </div>
            <div style={{ fontSize: '36px' }}>🏀</div>
          </div>

          {!prediction && !loading && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#666', marginBottom: '16px' }}>ENTER STAT LINE</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px', alignItems: 'center' }}>
                <input type="number" value={statLine} onChange={e => setStatLine(e.target.value)} placeholder="25.5" style={styles.input} />
                <span style={{ color: '#888' }}>{stat}</span>
              </div>
              {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '4px', padding: '16px', marginBottom: '24px', color: '#ff4444', fontFamily: "'Space Mono', monospace", fontSize: '12px' }}>{error}</div>}
              <button onClick={getPrediction} disabled={!statLine} style={{...styles.primaryBtn, ...(statLine ? {} : styles.disabledBtn)}}>GET PREDICTION</button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0,255,136,0.2)', borderTopColor: '#00ff88', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontFamily: "'Space Mono', monospace", color: '#00ff88' }}>ANALYZING WITH AI...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {prediction && !loading && (
            <div>
              <div style={styles.resultCard}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#666', marginBottom: '16px' }}>AI PREDICTION</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '64px', color: prediction.prediction === 'OVER' ? '#00ff88' : '#ff4444', lineHeight: 1, marginBottom: '16px' }}>{prediction.prediction}</div>
                <div style={{ fontSize: '24px', marginBottom: '24px' }}>{statLine} {stat}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>PROBABILITY</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: prediction.probability >= 60 ? '#00ff88' : prediction.probability >= 45 ? '#ffd700' : '#ff4444' }}>{prediction.probability}%</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#666', marginBottom: '4px' }}>CONFIDENCE</div>
                    <div style={{ fontSize: '20px', color: prediction.confidence === 'high' ? '#00ff88' : prediction.confidence === 'medium' ? '#ffd700' : '#ff4444', textTransform: 'uppercase' }}>{prediction.confidence}</div>
                  </div>
                </div>
              </div>

              {prediction.summary && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '24px', marginBottom: '24px' }}>
                  <p style={{ color: '#ccc', lineHeight: 1.6, margin: 0 }}>"{prediction.summary}"</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {prediction.factors && (
                  <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '20px' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00ff88', marginBottom: '12px' }}>▲ FACTORS</div>
                    {prediction.factors.map((f, i) => <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #00ff88' }}>{f}</div>)}
                  </div>
                )}
                {prediction.risks && (
                  <div style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px', padding: '20px' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#ff4444', marginBottom: '12px' }}>▼ RISKS</div>
                    {prediction.risks.map((r, i) => <div key={i} style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #ff4444' }}>{r}</div>)}
                  </div>
                )}
              </div>

              <button onClick={reset} style={{ width: '100%', background: 'transparent', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '16px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#888' }} onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88';}} onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#888';}}>NEW PREDICTION</button>
            </div>
          )}
        </div>
      )}

      <footer style={styles.footer}>POWERED BY CLAUDE AI • FOR ENTERTAINMENT PURPOSES ONLY</footer>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
