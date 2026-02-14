# 🏀 Stat Prophet

AI-powered NBA player prop predictions using machine learning + Claude reasoning.

![Stat Prophet](https://img.shields.io/badge/Status-Development-yellow)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## 🎯 What It Does

Stat Prophet predicts NBA player prop outcomes by:

1. **Fetching real-time data** from API-Sports (player stats, recent games, matchups)
2. **Running ML predictions** using a trained scikit-learn model
3. **Adding AI reasoning** via Claude for contextual analysis
4. **Delivering actionable predictions** with confidence scores and explanations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (React Landing Page)                      │
│     User selects: Sport → Player → Stat → Line              │
└─────────────────────────┬───────────────────────────────────┘
                          │ POST /api/predict
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS                         │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  API-Sports  │   │   ML Model   │   │    Claude    │    │
│  │    Client    │──▶│  (sklearn)   │──▶│  Reasoning   │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                                      │            │
│         ▼                                      ▼            │
│  ┌──────────────────────────────────────────────────┐      │
│  │              Supabase (PostgreSQL)                │      │
│  │   • Player cache  • Stats history  • Predictions │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Vercel CLI (`npm i -g vercel`)
- API Keys:
  - [API-Sports](https://dashboard.api-football.com/register) (free)
  - [Anthropic](https://console.anthropic.com/) 
  - [Supabase](https://supabase.com/) (free)

### 1. Clone & Install

```bash
# Clone the repo
git clone https://github.com/yourusername/stat-prophet.git
cd stat-prophet

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Python dependencies (for local testing)
pip install -r api/requirements.txt
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the contents of `database/schema.sql`
4. Copy your project URL and anon key from Settings > API

### 3. Configure Environment Variables

```bash
# Copy the template
cp .env.example .env.local

# Edit with your keys
nano .env.local
```

Add your keys:
```
API_SPORTS_KEY=your_key
ANTHROPIC_API_KEY=your_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key
```

### 4. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Add secrets
vercel secrets add api-sports-key "your_key"
vercel secrets add anthropic-api-key "your_key"
vercel secrets add supabase-url "your_url"
vercel secrets add supabase-key "your_key"

# Deploy
vercel
```

### 5. Test the API

```bash
# Search for a player
curl "https://your-app.vercel.app/api/players?search=LeBron"

# Get a prediction
curl -X POST "https://your-app.vercel.app/api/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "player_name": "LeBron James",
    "stat_type": "points",
    "line": 25.5
  }'
```

## 📡 API Endpoints

### `GET /api/players`

Search for NBA players.

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by name |
| `team` | number | Filter by team ID |
| `id` | number | Get specific player |

### `POST /api/predict`

Get a prediction for a player prop.

**Request Body:**
```json
{
  "player_name": "LeBron James",
  "stat_type": "points",
  "line": 25.5,
  "opponent": "Warriors",
  "is_home": true,
  "rest_days": 1,
  "include_reasoning": true
}
```

**Response:**
```json
{
  "success": true,
  "player": {
    "id": 236,
    "name": "LeBron James",
    "team": "Los Angeles Lakers"
  },
  "prop": {
    "stat": "points",
    "line": 25.5,
    "opponent": "Warriors"
  },
  "season_stats": {
    "ppg": 27.2,
    "rpg": 7.5,
    "apg": 8.1
  },
  "prediction": {
    "ml_probability": 72.5,
    "ml_prediction": "over",
    "ml_confidence": "high",
    "claude_verdict": "OVER",
    "key_insights": [
      "Averaging 28.3 over last 5 games",
      "Home game advantage"
    ],
    "risks": [
      "Warriors have strong perimeter defense"
    ],
    "summary": "LeBron has been scoring efficiently..."
  },
  "recommended_play": "OVER 25.5 points"
}
```

## 📊 Stat Types

| Stat Type | Description |
|-----------|-------------|
| `points` | Total points scored |
| `rebounds` | Total rebounds |
| `assists` | Total assists |
| `threes` | Three-pointers made |
| `steals` | Total steals |
| `blocks` | Total blocks |
| `pra` | Points + Rebounds + Assists |

## 🤖 ML Model

The prediction model uses:

- **Algorithm:** Gradient Boosting Classifier
- **Features:**
  - Season averages
  - Recent form (last 3/5/10 games)
  - Consistency (standard deviation)
  - Home/Away splits
  - Opponent defensive rating
  - Rest days
  - Minutes trend

### Training the Model

```python
from api.utils.ml_model import NBAStatPredictor
import pandas as pd

# Load your historical data
data = pd.read_csv("training_data.csv")

# Train
predictor = NBAStatPredictor()
predictor.train(data, "points")
```

## 📁 Project Structure

```
stat-prophet/
├── api/                      # Vercel serverless functions
│   ├── predict.py           # Main prediction endpoint
│   ├── players.py           # Player search endpoint
│   ├── requirements.txt     # Python dependencies
│   └── utils/
│       ├── api_sports.py    # API-Sports client
│       ├── ml_model.py      # ML prediction model
│       ├── claude_reasoning.py  # Claude integration
│       └── database.py      # Supabase client
│
├── frontend/                 # React app (Next.js)
│   └── ...
│
├── database/
│   └── schema.sql           # Supabase schema
│
├── ml/                       # ML model training
│   ├── train_model.py
│   └── models/              # Saved .pkl models
│
├── vercel.json              # Vercel configuration
├── .env.example             # Environment template
└── README.md
```

## 🔮 Future Enhancements

- [ ] Add more sports (NFL, MLB, NHL)
- [ ] Player prop comparisons
- [ ] Injury impact analysis
- [ ] Bet tracking & bankroll management
- [ ] Historical accuracy dashboard
- [ ] Real-time odds integration
- [ ] Push notifications for value plays

## ⚠️ Disclaimer

This tool is for entertainment and educational purposes only. Sports betting involves risk, and past performance does not guarantee future results. Please gamble responsibly.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ using Claude, Vercel, and API-Sports
