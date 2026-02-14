"""
ML Prediction Model for NBA Player Props
Uses scikit-learn for probability predictions
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from datetime import datetime


class NBAStatPredictor:
    """
    ML Model for predicting NBA player prop outcomes
    
    Features used:
    - Season averages
    - Recent form (last 5-10 games)
    - Home/Away splits
    - Opponent defensive rating
    - Rest days
    - Minutes trend
    """
    
    STAT_TYPES = ["points", "rebounds", "assists", "threes", "steals", "blocks", "pra"]
    
    def __init__(self, model_path: Optional[str] = None):
        self.models = {}
        self.scalers = {}
        self.model_path = model_path or os.path.join(os.path.dirname(__file__), "../ml/models")
        
        # Try to load existing models
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models if they exist"""
        for stat in self.STAT_TYPES:
            model_file = os.path.join(self.model_path, f"{stat}_model.pkl")
            scaler_file = os.path.join(self.model_path, f"{stat}_scaler.pkl")
            
            if os.path.exists(model_file) and os.path.exists(scaler_file):
                self.models[stat] = joblib.load(model_file)
                self.scalers[stat] = joblib.load(scaler_file)
    
    def _save_models(self):
        """Save trained models"""
        os.makedirs(self.model_path, exist_ok=True)
        
        for stat in self.STAT_TYPES:
            if stat in self.models:
                joblib.dump(self.models[stat], os.path.join(self.model_path, f"{stat}_model.pkl"))
                joblib.dump(self.scalers[stat], os.path.join(self.model_path, f"{stat}_scaler.pkl"))
    
    def prepare_features(
        self,
        season_avg: Dict,
        recent_games: List[Dict],
        opponent_def_rating: float = 110.0,
        is_home: bool = True,
        rest_days: int = 1
    ) -> np.ndarray:
        """
        Prepare feature vector for prediction
        
        Returns array of features:
        [
            season_avg,
            recent_avg (last 5),
            recent_avg (last 3),
            max_recent,
            min_recent,
            std_recent,
            trend (recent vs season),
            home_away (1 or 0),
            opponent_def_rating,
            rest_days,
            minutes_avg,
            usage_trend
        ]
        """
        if not recent_games:
            recent_games = []
        
        # Extract stat values from recent games (default to 0 if missing)
        def safe_get(game: Dict, key: str, default: float = 0) -> float:
            val = game.get(key, default)
            return float(val) if val is not None else default
        
        # Calculate features for each stat type
        features = {}
        
        for stat in self.STAT_TYPES:
            # Map stat name to actual key in data
            stat_key_map = {
                "points": "points",
                "rebounds": "rebounds",
                "assists": "assists",
                "threes": "threes",
                "steals": "steals",
                "blocks": "blocks",
                "pra": None  # Calculated field
            }
            
            # Get season average
            avg_key_map = {
                "points": "ppg",
                "rebounds": "rpg", 
                "assists": "apg",
                "threes": "tpg",
                "steals": "spg",
                "blocks": "bpg",
                "pra": None
            }
            
            if stat == "pra":
                # Points + Rebounds + Assists
                season_val = season_avg.get("ppg", 0) + season_avg.get("rpg", 0) + season_avg.get("apg", 0)
                recent_vals = [
                    safe_get(g, "points") + safe_get(g, "rebounds") + safe_get(g, "assists")
                    for g in recent_games
                ]
            else:
                season_val = season_avg.get(avg_key_map.get(stat, stat), 0)
                stat_key = stat_key_map.get(stat, stat)
                recent_vals = [safe_get(g, stat_key) for g in recent_games]
            
            # Calculate recent averages
            last_5 = recent_vals[:5] if len(recent_vals) >= 5 else recent_vals
            last_3 = recent_vals[:3] if len(recent_vals) >= 3 else recent_vals
            
            recent_avg_5 = np.mean(last_5) if last_5 else season_val
            recent_avg_3 = np.mean(last_3) if last_3 else season_val
            max_recent = max(recent_vals) if recent_vals else season_val
            min_recent = min(recent_vals) if recent_vals else season_val
            std_recent = np.std(recent_vals) if len(recent_vals) > 1 else 0
            
            # Trend: recent form vs season average
            trend = (recent_avg_5 - season_val) / max(season_val, 1) if season_val else 0
            
            # Get minutes info
            minutes_vals = [safe_get(g, "minutes") for g in recent_games]
            minutes_avg = np.mean(minutes_vals) if minutes_vals else season_avg.get("mpg", 30)
            
            # Build feature array for this stat
            features[stat] = np.array([
                season_val,           # 0: season average
                recent_avg_5,         # 1: last 5 games avg
                recent_avg_3,         # 2: last 3 games avg  
                max_recent,           # 3: max in recent games
                min_recent,           # 4: min in recent games
                std_recent,           # 5: consistency (std dev)
                trend,                # 6: form trend
                1.0 if is_home else 0.0,  # 7: home/away
                opponent_def_rating,  # 8: opponent defense
                rest_days,            # 9: days of rest
                minutes_avg,          # 10: expected minutes
                trend * minutes_avg / 30  # 11: usage proxy
            ])
        
        return features
    
    def predict(
        self,
        stat_type: str,
        line: float,
        season_avg: Dict,
        recent_games: List[Dict],
        opponent_def_rating: float = 110.0,
        is_home: bool = True,
        rest_days: int = 1
    ) -> Dict:
        """
        Predict probability of hitting a stat line
        
        Returns:
        {
            "probability": float (0-100),
            "confidence": str ("high", "medium", "low"),
            "prediction": str ("over", "under", "push"),
            "factors": dict of feature importances
        }
        """
        stat_type = stat_type.lower()
        if stat_type not in self.STAT_TYPES:
            # Try to map common names
            stat_map = {
                "pts": "points",
                "reb": "rebounds", 
                "ast": "assists",
                "3pm": "threes",
                "three-pointers": "threes",
                "stl": "steals",
                "blk": "blocks",
                "pts+reb+ast": "pra",
                "points+rebounds+assists": "pra"
            }
            stat_type = stat_map.get(stat_type, stat_type)
        
        features = self.prepare_features(
            season_avg, recent_games, opponent_def_rating, is_home, rest_days
        )
        
        if stat_type not in features:
            return {
                "probability": 50.0,
                "confidence": "low",
                "prediction": "unknown",
                "error": f"Unknown stat type: {stat_type}"
            }
        
        X = features[stat_type].reshape(1, -1)
        
        # Check if we have a trained model
        if stat_type in self.models and stat_type in self.scalers:
            # Use ML model
            X_scaled = self.scalers[stat_type].transform(X)
            prob = self.models[stat_type].predict_proba(X_scaled)[0]
            over_prob = prob[1] * 100 if len(prob) > 1 else 50.0
        else:
            # Fallback to heuristic model
            over_prob = self._heuristic_predict(stat_type, line, features[stat_type])
        
        # Determine prediction and confidence
        if over_prob >= 65:
            prediction = "over"
            confidence = "high" if over_prob >= 75 else "medium"
        elif over_prob <= 35:
            prediction = "under"
            confidence = "high" if over_prob <= 25 else "medium"
        else:
            prediction = "push"
            confidence = "low"
        
        # Identify key factors
        factors = self._analyze_factors(stat_type, line, features[stat_type], season_avg)
        
        return {
            "probability": round(over_prob, 1),
            "confidence": confidence,
            "prediction": prediction,
            "recommended_play": f"{prediction.upper()} {line} {stat_type}",
            "factors": factors
        }
    
    def _heuristic_predict(self, stat_type: str, line: float, features: np.ndarray) -> float:
        """
        Fallback heuristic prediction when no ML model is available
        Uses statistical analysis of features
        """
        season_avg = features[0]
        recent_avg_5 = features[1]
        recent_avg_3 = features[2]
        max_recent = features[3]
        min_recent = features[4]
        std_recent = features[5]
        trend = features[6]
        is_home = features[7]
        opp_def = features[8]
        rest_days = features[9]
        
        # Base probability from comparing line to averages
        avg_of_avgs = (season_avg * 0.3 + recent_avg_5 * 0.4 + recent_avg_3 * 0.3)
        
        # How many standard deviations is the line from average?
        if std_recent > 0:
            z_score = (line - avg_of_avgs) / std_recent
        else:
            z_score = (line - avg_of_avgs) / max(avg_of_avgs * 0.15, 1)
        
        # Convert z-score to probability (using sigmoid-like function)
        # Negative z-score = line below average = more likely to go over
        base_prob = 100 / (1 + np.exp(z_score * 1.5))
        
        # Adjustments
        adjustments = 0
        
        # Trend adjustment (+/- 5%)
        if trend > 0.1:
            adjustments += 5
        elif trend < -0.1:
            adjustments -= 5
        
        # Home court advantage (+3%)
        if is_home:
            adjustments += 3
        
        # Rest days (well-rested = slight boost)
        if rest_days >= 2:
            adjustments += 2
        elif rest_days == 0:
            adjustments -= 3
        
        # Opponent defense (league avg ~110)
        if opp_def > 115:  # Bad defense
            adjustments += 4
        elif opp_def < 105:  # Good defense
            adjustments -= 4
        
        # Consistency bonus/penalty
        if std_recent < avg_of_avgs * 0.1:  # Very consistent
            # Move probability toward extremes (more confident)
            if base_prob > 50:
                adjustments += 3
            else:
                adjustments -= 3
        
        final_prob = np.clip(base_prob + adjustments, 5, 95)
        return final_prob
    
    def _analyze_factors(
        self, 
        stat_type: str, 
        line: float, 
        features: np.ndarray,
        season_avg: Dict
    ) -> Dict:
        """Identify key factors influencing the prediction"""
        factors = {
            "supporting": [],
            "opposing": []
        }
        
        season_val = features[0]
        recent_5 = features[1]
        recent_3 = features[2]
        max_recent = features[3]
        min_recent = features[4]
        trend = features[6]
        is_home = features[7]
        opp_def = features[8]
        rest_days = features[9]
        
        # Analyze each factor
        if recent_5 > line:
            factors["supporting"].append(f"Averaging {recent_5:.1f} over last 5 games (above line)")
        elif recent_5 < line:
            factors["opposing"].append(f"Averaging {recent_5:.1f} over last 5 games (below line)")
        
        if trend > 0.1:
            factors["supporting"].append("Player is trending upward recently")
        elif trend < -0.1:
            factors["opposing"].append("Player is trending downward recently")
        
        if is_home:
            factors["supporting"].append("Home game advantage")
        
        if opp_def > 115:
            factors["supporting"].append(f"Facing weak defense (rating: {opp_def:.1f})")
        elif opp_def < 105:
            factors["opposing"].append(f"Facing strong defense (rating: {opp_def:.1f})")
        
        if rest_days >= 2:
            factors["supporting"].append(f"Well-rested ({rest_days} days off)")
        elif rest_days == 0:
            factors["opposing"].append("Back-to-back game (fatigue risk)")
        
        if max_recent > line * 1.3:
            factors["supporting"].append(f"Has hit {max_recent:.0f} recently (high ceiling)")
        
        if min_recent < line * 0.7:
            factors["opposing"].append(f"Has put up only {min_recent:.0f} recently (low floor)")
        
        return factors
    
    def train(self, training_data: pd.DataFrame, stat_type: str):
        """
        Train model on historical data
        
        training_data should have columns:
        - All feature columns
        - 'actual': the actual stat value
        - 'line': the betting line
        - 'hit': 1 if actual > line, 0 otherwise
        """
        if stat_type not in self.STAT_TYPES:
            raise ValueError(f"Unknown stat type: {stat_type}")
        
        feature_cols = [
            'season_avg', 'recent_avg_5', 'recent_avg_3', 'max_recent',
            'min_recent', 'std_recent', 'trend', 'is_home', 
            'opp_def_rating', 'rest_days', 'minutes_avg', 'usage_proxy'
        ]
        
        X = training_data[feature_cols].values
        y = training_data['hit'].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42
        )
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = model.score(X_train_scaled, y_train)
        test_score = model.score(X_test_scaled, y_test)
        
        print(f"Model trained for {stat_type}")
        print(f"  Train accuracy: {train_score:.3f}")
        print(f"  Test accuracy: {test_score:.3f}")
        
        # Save
        self.models[stat_type] = model
        self.scalers[stat_type] = scaler
        self._save_models()
        
        return {"train_accuracy": train_score, "test_accuracy": test_score}


# Example usage
if __name__ == "__main__":
    predictor = NBAStatPredictor()
    
    # Example prediction
    result = predictor.predict(
        stat_type="points",
        line=25.5,
        season_avg={"ppg": 27.2, "rpg": 7.5, "apg": 8.1, "mpg": 35.5},
        recent_games=[
            {"points": 30, "rebounds": 8, "assists": 10, "minutes": 36},
            {"points": 25, "rebounds": 6, "assists": 7, "minutes": 34},
            {"points": 28, "rebounds": 9, "assists": 12, "minutes": 38},
            {"points": 22, "rebounds": 5, "assists": 6, "minutes": 32},
            {"points": 31, "rebounds": 7, "assists": 9, "minutes": 37},
        ],
        opponent_def_rating=112.5,
        is_home=True,
        rest_days=1
    )
    
    print(f"Prediction: {result}")
