const API_URL = 'https://stat-prophet.vercel.app/api';

const nbaPlayers = [
  // Atlanta Hawks
  'Trae Young', 'Dejounte Murray', 'Jalen Johnson', 'De\'Andre Hunter', 'Clint Capela', 'Bogdan Bogdanović', 'Onyeka Okongwu', 'Saddiq Bey', 'Garrison Mathews', 'Seth Lundy',
  // Boston Celtics
  'Jayson Tatum', 'Jaylen Brown', 'Derrick White', 'Jrue Holiday', 'Kristaps Porziņģis', 'Al Horford', 'Payton Pritchard', 'Sam Hauser', 'Luke Kornet', 'Neemias Queta',
  // Brooklyn Nets
  'Mikal Bridges', 'Cameron Johnson', 'Spencer Dinwiddie', 'Nic Claxton', 'Dorian Finney-Smith', 'Dennis Schröder', 'Day\'Ron Sharpe', 'Cam Thomas', 'Ben Simmons', 'Trendon Watford',
  // Charlotte Hornets
  'LaMelo Ball', 'Brandon Miller', 'Miles Bridges', 'Terry Rozier', 'P.J. Washington', 'Mark Williams', 'Gordon Hayward', 'Nick Richards', 'Cody Martin', 'Bryce McGowens',
  // Chicago Bulls
  'DeMar DeRozan', 'Zach LaVine', 'Nikola Vučević', 'Coby White', 'Patrick Williams', 'Alex Caruso', 'Ayo Dosunmu', 'Andre Drummond', 'Torrey Craig', 'Javonte Green',
  // Cleveland Cavaliers
  'Donovan Mitchell', 'Darius Garland', 'Evan Mobley', 'Jarrett Allen', 'Max Strus', 'Caris LeVert', 'Isaac Okoro', 'Georges Niang', 'Dean Wade', 'Sam Merrill',
  // Dallas Mavericks
  'Luka Dončić', 'Kyrie Irving', 'Tim Hardaway Jr.', 'Derrick Jones Jr.', 'Josh Green', 'Maxi Kleber', 'Dwight Powell', 'Dante Exum', 'Grant Williams', 'Jaden Hardy',
  // Denver Nuggets
  'Nikola Jokić', 'Jamal Murray', 'Michael Porter Jr.', 'Aaron Gordon', 'Kentavious Caldwell-Pope', 'Reggie Jackson', 'Christian Braun', 'Peyton Watson', 'Zeke Nnaji', 'Julian Strawther',
  // Detroit Pistons
  'Cade Cunningham', 'Jaden Ivey', 'Bojan Bogdanović', 'Ausar Thompson', 'Jalen Duren', 'Isaiah Stewart', 'Alec Burks', 'Joe Harris', 'Monte Morris', 'James Wiseman',
  // Golden State Warriors
  'Stephen Curry', 'Klay Thompson', 'Andrew Wiggins', 'Draymond Green', 'Chris Paul', 'Jonathan Kuminga', 'Kevon Looney', 'Gary Payton II', 'Moses Moody', 'Brandin Podziemski',
  // Houston Rockets
  'Jalen Green', 'Alperen Şengün', 'Jabari Smith Jr.', 'Fred VanVleet', 'Dillon Brooks', 'Amen Thompson', 'Tari Eason', 'Cam Whitmore', 'Jeff Green', 'Jock Landale',
  // Indiana Pacers
  'Tyrese Haliburton', 'Myles Turner', 'Buddy Hield', 'Pascal Siakam', 'Aaron Nesmith', 'Bruce Brown', 'Bennedict Mathurin', 'Obi Toppin', 'T.J. McConnell', 'Andrew Nembhard',
  // LA Clippers
  'Kawhi Leonard', 'Paul George', 'James Harden', 'Russell Westbrook', 'Ivica Zubac', 'Norman Powell', 'Terance Mann', 'Bones Hyland', 'Amir Coffey', 'Brandon Boston Jr.',
  // Los Angeles Lakers
  'LeBron James', 'Anthony Davis', 'Austin Reaves', 'D\'Angelo Russell', 'Rui Hachimura', 'Jarred Vanderbilt', 'Taurean Prince', 'Gabe Vincent', 'Christian Wood', 'Jaxson Hayes',
  // Memphis Grizzlies
  'Ja Morant', 'Jaren Jackson Jr.', 'Desmond Bane', 'Marcus Smart', 'Santi Aldama', 'Luke Kennard', 'Brandon Clarke', 'Ziaire Williams', 'David Roddy', 'GG Jackson',
  // Miami Heat
  'Jimmy Butler', 'Bam Adebayo', 'Tyler Herro', 'Terry Rozier', 'Caleb Martin', 'Duncan Robinson', 'Kevin Love', 'Nikola Jović', 'Haywood Highsmith', 'Jaime Jaquez Jr.',
  // Milwaukee Bucks
  'Giannis Antetokounmpo', 'Damian Lillard', 'Khris Middleton', 'Brook Lopez', 'Bobby Portis', 'Malik Beasley', 'Pat Connaughton', 'MarJon Beauchamp', 'Andre Jackson Jr.', 'AJ Green',
  // Minnesota Timberwolves
  'Anthony Edwards', 'Karl-Anthony Towns', 'Rudy Gobert', 'Jaden McDaniels', 'Mike Conley', 'Naz Reid', 'Nickeil Alexander-Walker', 'Kyle Anderson', 'Jordan McLaughlin', 'Luka Garza',
  // New Orleans Pelicans
  'Zion Williamson', 'Brandon Ingram', 'CJ McCollum', 'Herb Jones', 'Jonas Valančiūnas', 'Trey Murphy III', 'Larry Nance Jr.', 'Jose Alvarado', 'Dyson Daniels', 'Jordan Hawkins',
  // New York Knicks
  'Jalen Brunson', 'Julius Randle', 'RJ Barrett', 'Josh Hart', 'Mitchell Robinson', 'Donte DiVincenzo', 'Immanuel Quickley', 'Evan Fournier', 'Quentin Grimes', 'Isaiah Hartenstein',
  // Oklahoma City Thunder
  'Shai Gilgeous-Alexander', 'Jalen Williams', 'Chet Holmgren', 'Luguentz Dort', 'Josh Giddey', 'Cason Wallace', 'Isaiah Joe', 'Kenrich Williams', 'Aaron Wiggins', 'Jaylin Williams',
  // Orlando Magic
  'Paolo Banchero', 'Franz Wagner', 'Jalen Suggs', 'Wendell Carter Jr.', 'Cole Anthony', 'Markelle Fultz', 'Gary Harris', 'Jonathan Isaac', 'Moritz Wagner', 'Joe Ingles',
  // Philadelphia 76ers
  'Joel Embiid', 'Tyrese Maxey', 'Tobias Harris', 'De\'Anthony Melton', 'Kelly Oubre Jr.', 'Buddy Hield', 'Cameron Payne', 'Paul Reed', 'Nicolas Batum', 'Mo Bamba',
  // Phoenix Suns
  'Kevin Durant', 'Devin Booker', 'Bradley Beal', 'Jusuf Nurkić', 'Grayson Allen', 'Eric Gordon', 'Drew Eubanks', 'Nassir Little', 'Bol Bol', 'Chimezie Metu',
  // Portland Trail Blazers
  'Anfernee Simons', 'Jerami Grant', 'Deandre Ayton', 'Scoot Henderson', 'Malcolm Brogdon', 'Shaedon Sharpe', 'Robert Williams III', 'Matisse Thybulle', 'Toumani Camara', 'Jabari Walker',
  // Sacramento Kings
  'De\'Aaron Fox', 'Domantas Sabonis', 'Keegan Murray', 'Harrison Barnes', 'Malik Monk', 'Kevin Huerter', 'Trey Lyles', 'Davion Mitchell', 'Chris Duarte', 'Kessler Edwards',
  // San Antonio Spurs
  'Victor Wembanyama', 'Devin Vassell', 'Keldon Johnson', 'Tre Jones', 'Jeremy Sochan', 'Zach Collins', 'Doug McDermott', 'Malaki Branham', 'Julian Champagnie', 'Cedi Osman',
  // Toronto Raptors
  'Scottie Barnes', 'Pascal Siakam', 'OG Anunoby', 'Gary Trent Jr.', 'Jakob Poeltl', 'Immanuel Quickley', 'RJ Barrett', 'Chris Boucher', 'Precious Achiuwa', 'Gradey Dick',
  // Utah Jazz
  'Lauri Markkanen', 'Jordan Clarkson', 'Collin Sexton', 'John Collins', 'Walker Kessler', 'Kelly Olynyk', 'Talen Horton-Tucker', 'Ochai Agbaji', 'Keyonte George', 'Simone Fontecchio',
  // Washington Wizards
  'Kyle Kuzma', 'Jordan Poole', 'Deni Avdija', 'Tyus Jones', 'Daniel Gafford', 'Corey Kispert', 'Marvin Bagley III', 'Landry Shamet', 'Anthony Gill', 'Bilal Coulibaly'
];

const featuredPlayers = [
  'LeBron James', 'Stephen Curry', 'Giannis Antetokounmpo', 'Luka Dončić', 
  'Kevin Durant', 'Jayson Tatum', 'Joel Embiid', 'Nikola Jokić',
  'Anthony Edwards', 'Shai Gilgeous-Alexander', 'Ja Morant', 'Victor Wembanyama'
];

const sportsData = {
  'NBA': {
    icon: '🏀',
    players: nbaPlayers,
    featured: featuredPlayers,
    stats: ['Points', 'Rebounds', 'Assists', 'Three-Pointers', 'Steals', 'Blocks']
  }
};

function App() {
  const [step, setStep] = React.useState(1);
  const [sport, setSport] = React.useState('');
  const [player, setPlayer] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stat, setStat] = React.useState('');
  const [direction, setDirection] = React.useState('');
  const [line, setLine] = React.useState('');
  const [prediction, setPrediction] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const allPlayers = sport ? sportsData[sport].players : [];
  const featured = sport ? sportsData[sport].featured : [];
  const statCategories = sport ? sportsData[sport].stats : [];

  const filteredPlayers = searchQuery 
    ? allPlayers.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 12)
    : featured;

  const handleSportSelect = (s) => { setSport(s); setStep(2); };
  const handlePlayerSelect = (p) => { setPlayer(p); setSearchQuery(''); setStep(3); };
  const handleStatSelect = (s) => { setStat(s); setStep(4); };
  const handleDirectionSelect = (d) => { setDirection(d); setStep(5); };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setPlayer(searchQuery.trim());
      setSearchQuery('');
      setStep(3);
    }
  };

  const reset = () => {
    setStep(1); setSport(''); setPlayer(''); setSearchQuery(''); setStat(''); 
    setDirection(''); setLine(''); setPrediction(null); setError(null);
  };

  const goBack = () => {
    if (step === 2) { setStep(1); setSport(''); setPlayer(''); }
    else if (step === 3) { setStep(2); setStat(''); }
    else if (step === 4) { setStep(3); setDirection(''); }
    else if (step === 5) { setStep(4); setLine(''); setPrediction(null); }
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
    title: { fontSize: 'clamp(48px, 10vw, 80px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '4px', background: 'linear-gradient(180deg, #fff 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#666', letterSpacing: '2px' },
    progress: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '50px' },
    sectionTitle: { textAlign: 'center', fontSize: '24px', fontWeight: '300', letterSpacing: '4px', marginBottom: '40px', color: '#888' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    sportCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '40px 60px', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' },
    backBtn: { background: 'none', border: 'none', color: '#00ff88', fontFamily: "'Space Mono', monospace", fontSize: '12px', cursor: 'pointer', marginBottom: '30px' },
    searchContainer: { maxWidth: '500px', margin: '0 auto 40px' },
    searchInput: { width: '100%', padding: '16px 24px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontFamily: "'Oswald', sans-serif", fontSize: '18px', outline: 'none', transition: 'border-color 0.3s' },
    lineInput: { width: '120px', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '24px', textAlign: 'center', outline: 'none' },
    primaryBtn: { background: 'linear-gradient(90deg, #00ff88, #00cc6a)', border: 'none', borderRadius: '4px', padding: '20px 60px', cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '3px', color: '#0a0a0f' },
    disabledBtn: { background: '#333', color: '#666', cursor: 'not-allowed' },
    directionBtn: { flex: 1, padding: '30px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s', background: 'rgba(255,255,255,0.03)' },
    resultCard: { background: 'linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '50px', marginBottom: '24px', textAlign: 'center' },
    footer: { textAlign: 'center', marginTop: '80px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#444' },
    searchCount: { textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#00ff88', marginBottom: '20px' }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.badge}>AI-POWERED ANALYTICS</div>
        <h1 style={styles.title}>STAT PROPHET</h1>
        <p style={styles.subtitle}>NEXT-GEN PROP PREDICTIONS</p>
      </header>

      <div style={styles.progress}>
        {[1,2,3,4,5].map(s => (
          <div key={s} style={{ width: s <= step ? '50px' : '12px', height: '4px', background: s <= step ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.4s' }} />
        ))}
      </div>

      {/* Step 1: Sport Selection */}
      {step === 1 && (
        <div>
          <h2 style={styles.sectionTitle}>SELECT YOUR SPORT</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {Object.entries(sportsData).map(([sportName, data]) => (
              <div 
                key={sportName}
                onClick={() => handleSportSelect(sportName)}
                style={styles.sportCard}
                onMouseOver={e => {e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,255,136,0.2)';}}
                onMouseOut={e => {e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none';}}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{data.icon}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', letterSpacing: '2px' }}>{sportName}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#444', marginTop: '40px' }}>More sports coming soon...</p>
        </div>
      )}

      {/* Step 2: Player Selection */}
      {step === 2 && (
        <div>
          <button style={styles.backBtn} onClick={goBack}>← BACK TO SPORTS</button>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '36px' }}>{sportsData[sport].icon}</span>
          </div>
          
          <h2 style={styles.sectionTitle}>SELECT PLAYER</h2>
          
          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search 300+ NBA players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => e.target.style.borderColor = '#00ff88'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </form>
          </div>

          {/* Results count or featured label */}
          <div style={styles.searchCount}>
            {searchQuery 
              ? `${allPlayers.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase())).length} PLAYERS FOUND`
              : 'FEATURED PLAYERS'
            }
          </div>
          
          <div style={styles.grid}>
            {filteredPlayers.map(p => (
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
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <p style={{ color: '#888', marginBottom: '16px' }}>No players found for "{searchQuery}"</p>
              <button 
                onClick={() => { setPlayer(searchQuery.trim()); setSearchQuery(''); setStep(3); }}
                style={{ background: 'transparent', border: '1px solid #00ff88', borderRadius: '4px', padding: '12px 24px', color: '#00ff88', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '12px' }}
              >
                USE "{searchQuery.toUpperCase()}" ANYWAY
              </button>
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

      {/* Step 4: Over/Under Selection */}
      {step === 4 && (
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

      {/* Step 5: Enter Line Value */}
      {step === 5 && (
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
