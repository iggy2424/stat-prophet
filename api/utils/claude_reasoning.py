"""
Claude Reasoning Layer for NBA Predictions
Adds contextual analysis and natural language explanations
"""

import os
import json
from typing import Dict, List, Optional
import anthropic


class ClaudeReasoning:
    """
    Uses Claude to provide intelligent analysis and reasoning
    on top of ML predictions
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model = "claude-sonnet-4-20250514"
    
    def analyze_prediction(
        self,
        player_name: str,
        stat_type: str,
        line: float,
        ml_prediction: Dict,
        season_avg: Dict,
        recent_games: List[Dict],
        opponent: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> Dict:
        """
        Get Claude's analysis of a prediction
        
        Returns:
        {
            "verdict": str,
            "confidence_explanation": str,
            "key_insights": list,
            "risks": list,
            "alternative_plays": list,
            "summary": str
        }
        """
        
        # Build context for Claude
        prompt = self._build_analysis_prompt(
            player_name=player_name,
            stat_type=stat_type,
            line=line,
            ml_prediction=ml_prediction,
            season_avg=season_avg,
            recent_games=recent_games,
            opponent=opponent,
            additional_context=additional_context
        )
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse the response
            content = response.content[0].text
            return self._parse_analysis(content, ml_prediction)
            
        except Exception as e:
            print(f"Claude API Error: {e}")
            return self._fallback_analysis(ml_prediction)
    
    def _build_analysis_prompt(
        self,
        player_name: str,
        stat_type: str,
        line: float,
        ml_prediction: Dict,
        season_avg: Dict,
        recent_games: List[Dict],
        opponent: Optional[str],
        additional_context: Optional[str]
    ) -> str:
        """Build the prompt for Claude analysis"""
        
        # Format recent games
        recent_games_str = ""
        for i, game in enumerate(recent_games[:5], 1):
            pts = game.get("points", "N/A")
            reb = game.get("rebounds", "N/A")
            ast = game.get("assists", "N/A")
            mins = game.get("minutes", "N/A")
            recent_games_str += f"  Game {i}: {pts} pts, {reb} reb, {ast} ast in {mins} min\n"
        
        prompt = f"""You are an expert NBA analyst providing betting insights. Analyze this player prop bet and provide your assessment.

## Player: {player_name}
## Prop: {stat_type.upper()} {line}
## Opponent: {opponent or "Unknown"}

### Season Averages:
- Points: {season_avg.get('ppg', 'N/A')} PPG
- Rebounds: {season_avg.get('rpg', 'N/A')} RPG  
- Assists: {season_avg.get('apg', 'N/A')} APG
- Minutes: {season_avg.get('mpg', 'N/A')} MPG
- Games Played: {season_avg.get('games_played', 'N/A')}

### Last 5 Games:
{recent_games_str}

### ML Model Prediction:
- Probability of OVER: {ml_prediction.get('probability', 50)}%
- Confidence: {ml_prediction.get('confidence', 'medium')}
- Recommendation: {ml_prediction.get('prediction', 'unknown')}

### Supporting Factors:
{json.dumps(ml_prediction.get('factors', {}).get('supporting', []), indent=2)}

### Risk Factors:
{json.dumps(ml_prediction.get('factors', {}).get('opposing', []), indent=2)}

{f"### Additional Context: {additional_context}" if additional_context else ""}

---

Based on this data, provide your analysis in the following JSON format:
{{
    "verdict": "OVER" or "UNDER" or "AVOID",
    "confidence_score": 1-10,
    "confidence_explanation": "Brief explanation of confidence level",
    "key_insights": ["insight 1", "insight 2", "insight 3"],
    "risks": ["risk 1", "risk 2"],
    "alternative_plays": [
        {{"line": "24.5", "direction": "OVER", "confidence": "higher"}},
        {{"line": "26.5", "direction": "UNDER", "confidence": "similar"}}
    ],
    "summary": "2-3 sentence summary of the play"
}}

Respond ONLY with the JSON object, no other text."""

        return prompt
    
    def _parse_analysis(self, content: str, ml_prediction: Dict) -> Dict:
        """Parse Claude's response into structured data"""
        try:
            # Clean up the response
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            analysis = json.loads(content.strip())
            
            # Merge with ML prediction
            return {
                "ml_probability": ml_prediction.get("probability"),
                "ml_prediction": ml_prediction.get("prediction"),
                "ml_confidence": ml_prediction.get("confidence"),
                "ml_factors": ml_prediction.get("factors"),
                "claude_verdict": analysis.get("verdict"),
                "claude_confidence_score": analysis.get("confidence_score"),
                "claude_explanation": analysis.get("confidence_explanation"),
                "key_insights": analysis.get("key_insights", []),
                "risks": analysis.get("risks", []),
                "alternative_plays": analysis.get("alternative_plays", []),
                "summary": analysis.get("summary", "")
            }
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse Claude response: {e}")
            return self._fallback_analysis(ml_prediction)
    
    def _fallback_analysis(self, ml_prediction: Dict) -> Dict:
        """Provide a fallback analysis if Claude fails"""
        prob = ml_prediction.get("probability", 50)
        pred = ml_prediction.get("prediction", "unknown")
        
        return {
            "ml_probability": prob,
            "ml_prediction": pred,
            "ml_confidence": ml_prediction.get("confidence"),
            "ml_factors": ml_prediction.get("factors"),
            "claude_verdict": pred.upper() if pred != "push" else "AVOID",
            "claude_confidence_score": 5,
            "claude_explanation": "Analysis based on ML model only (Claude unavailable)",
            "key_insights": ml_prediction.get("factors", {}).get("supporting", []),
            "risks": ml_prediction.get("factors", {}).get("opposing", []),
            "alternative_plays": [],
            "summary": f"ML model suggests {pred.upper()} with {prob}% probability."
        }
    
    def generate_game_preview(
        self,
        player_name: str,
        team: str,
        opponent: str,
        season_avg: Dict,
        recent_games: List[Dict]
    ) -> str:
        """Generate a natural language game preview"""
        
        prompt = f"""You are a sports analyst writing a brief preview for {player_name}'s upcoming game.

Team: {team} vs {opponent}

Season Stats:
- {season_avg.get('ppg', 0)} PPG, {season_avg.get('rpg', 0)} RPG, {season_avg.get('apg', 0)} APG

Recent form (last 3 games):
{json.dumps(recent_games[:3], indent=2)}

Write a 2-3 sentence preview focusing on what to expect from this player tonight. Be specific and analytical, not generic."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            return f"{player_name} looks to continue their season performance tonight against {opponent}."
    
    def suggest_best_props(
        self,
        player_name: str,
        season_avg: Dict,
        recent_games: List[Dict],
        available_lines: Dict[str, float]
    ) -> List[Dict]:
        """
        Suggest the best prop bets for a player
        
        available_lines format:
        {"points": 25.5, "rebounds": 7.5, "assists": 8.5, ...}
        """
        
        prompt = f"""You are an expert sports bettor. Given this player's data, identify the BEST value prop bet.

Player: {player_name}

Season Averages:
- Points: {season_avg.get('ppg', 0)}
- Rebounds: {season_avg.get('rpg', 0)}
- Assists: {season_avg.get('apg', 0)}
- Minutes: {season_avg.get('mpg', 0)}

Last 5 Games Performance:
{json.dumps(recent_games[:5], indent=2)}

Available Betting Lines:
{json.dumps(available_lines, indent=2)}

Identify the single best value play. Respond with JSON:
{{
    "best_prop": "stat type",
    "line": number,
    "direction": "OVER" or "UNDER",
    "reasoning": "brief explanation",
    "confidence": "high" or "medium" or "low"
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text.strip()
            if "```" in content:
                content = content.split("```")[1].replace("json", "").strip()
            
            return json.loads(content)
            
        except Exception as e:
            print(f"Error suggesting props: {e}")
            return {"error": "Unable to suggest props"}


# Example usage
if __name__ == "__main__":
    claude = ClaudeReasoning()
    
    analysis = claude.analyze_prediction(
        player_name="LeBron James",
        stat_type="points",
        line=25.5,
        ml_prediction={
            "probability": 72.5,
            "confidence": "high",
            "prediction": "over",
            "factors": {
                "supporting": ["Averaging 28.3 over last 5", "Home game"],
                "opposing": ["Back-to-back game"]
            }
        },
        season_avg={"ppg": 27.2, "rpg": 7.5, "apg": 8.1, "mpg": 35.5},
        recent_games=[
            {"points": 30, "rebounds": 8, "assists": 10},
            {"points": 25, "rebounds": 6, "assists": 7},
            {"points": 28, "rebounds": 9, "assists": 12},
        ],
        opponent="Golden State Warriors"
    )
    
    print(json.dumps(analysis, indent=2))
