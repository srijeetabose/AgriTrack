"""
Harvest Predictor Module - Task 1
=================================
Predicts harvest readiness based on NDVI (Normalized Difference Vegetation Index) trends.

NDVI Science Background:
------------------------
NDVI measures vegetation health using satellite imagery:

    NDVI = (NIR - Red) / (NIR + Red)

Where:
    - NIR (Near-Infrared, ~842nm): Healthy plant cells reflect NIR strongly due to 
      their internal structure (mesophyll cells scatter NIR light)
    - Red (~665nm): Chlorophyll in healthy plants absorbs red light for photosynthesis

Why NDVI works for harvest prediction:
    1. Growing crops: High chlorophyll → High red absorption, high NIR reflection → NDVI ~0.7-0.9
    2. Maturing crops: Chlorophyll decreases → Less red absorption → NDVI drops to 0.5-0.7
    3. Harvest-ready: Plants turn brown/yellow → NDVI drops below 0.4
    4. Post-harvest stubble: Dry residue → NDVI ~0.2-0.3

For Punjab/Haryana rice (Kharif season):
    - Peak growth (Sept): NDVI 0.7-0.85
    - Pre-harvest (Oct): NDVI 0.4-0.6
    - Harvest-ready (Nov): NDVI < 0.4
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json


class HarvestPredictor:
    """
    Predicts harvest readiness dates for districts based on NDVI time-series analysis.
    
    The predictor analyzes NDVI decline rates to estimate when crops will be ready
    for harvest (NDVI drops below threshold), helping plan machine deployment
    for stubble management and preventing crop residue burning.
    """
    
    # NDVI threshold below which crops are considered harvest-ready
    HARVEST_THRESHOLD = 0.4
    
    # Minimum days of data required for reliable prediction
    MIN_DATA_DAYS = 7
    
    def __init__(self, ndvi_data: pd.DataFrame):
        """
        Initialize the predictor with NDVI time-series data.
        
        Args:
            ndvi_data: DataFrame with columns [date, district_id, district_name, state, lat, lon, ndvi]
        """
        self.ndvi_data = ndvi_data.copy()
        self.ndvi_data['date'] = pd.to_datetime(self.ndvi_data['date'])
        self.predictions = {}
    
    def calculate_ndvi_decline_rate(self, district_id: str) -> Dict:
        """
        Calculate the rate of NDVI decline for a specific district.
        
        Uses linear regression to find the slope of NDVI over time.
        A steeper negative slope indicates faster crop maturation.
        
        Args:
            district_id: The district identifier
            
        Returns:
            Dict with decline_rate, r_squared, and trend analysis
        """
        district_data = self.ndvi_data[self.ndvi_data['district_id'] == district_id].copy()
        district_data = district_data.sort_values('date')
        
        if len(district_data) < self.MIN_DATA_DAYS:
            return {"error": f"Insufficient data: need {self.MIN_DATA_DAYS} days, have {len(district_data)}"}
        
        # Convert dates to numeric (days since start)
        district_data['day_num'] = (district_data['date'] - district_data['date'].min()).dt.days
        
        # Linear regression: NDVI = slope * day + intercept
        x = district_data['day_num'].values
        y = district_data['ndvi'].values
        
        # Calculate slope using numpy polyfit
        slope, intercept = np.polyfit(x, y, 1)
        
        # Calculate R-squared for confidence
        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        return {
            "decline_rate_per_day": round(slope, 6),  # Negative value indicates decline
            "intercept": round(intercept, 4),
            "r_squared": round(r_squared, 4),  # How well the linear model fits
            "current_ndvi": round(y[-1], 4),
            "start_ndvi": round(y[0], 4),
            "total_days": len(x),
            "trend": "declining" if slope < -0.005 else "stable" if abs(slope) < 0.005 else "increasing"
        }
    
    def predict_harvest_date(self, district_id: str) -> Optional[Dict]:
        """
        Predict when a district will reach harvest-ready status (NDVI < 0.4).
        
        Logic:
        1. Calculate current NDVI decline rate
        2. Extrapolate when NDVI will cross the 0.4 threshold
        3. If already below threshold, mark as URGENT
        
        Args:
            district_id: The district identifier
            
        Returns:
            Dict with prediction details or None if prediction not possible
        """
        analysis = self.calculate_ndvi_decline_rate(district_id)
        
        if "error" in analysis:
            return None
        
        district_info = self.ndvi_data[self.ndvi_data['district_id'] == district_id].iloc[-1]
        current_ndvi = analysis["current_ndvi"]
        decline_rate = analysis["decline_rate_per_day"]
        
        # If already below threshold, harvest is imminent
        if current_ndvi <= self.HARVEST_THRESHOLD:
            days_to_harvest = 0
            predicted_date = datetime.now()
            status = "HARVEST_READY"
        elif decline_rate >= 0:
            # NDVI not declining - cannot predict harvest
            days_to_harvest = None
            predicted_date = None
            status = "NOT_DECLINING"
        else:
            # Calculate days until NDVI reaches threshold
            # threshold = current + (decline_rate * days)
            # days = (threshold - current) / decline_rate
            days_to_harvest = int((self.HARVEST_THRESHOLD - current_ndvi) / decline_rate)
            days_to_harvest = max(0, days_to_harvest)
            predicted_date = datetime.now() + timedelta(days=days_to_harvest)
            status = "PREDICTED"
        
        # Calculate priority score (1-10, where 10 is most urgent)
        priority_score = self._calculate_priority_score(
            current_ndvi=current_ndvi,
            decline_rate=decline_rate,
            days_to_harvest=days_to_harvest
        )
        
        return {
            "district_id": district_id,
            "district_name": district_info["district_name"],
            "state": district_info["state"],
            "lat": district_info["lat"],
            "lon": district_info["lon"],
            "current_ndvi": current_ndvi,
            "ndvi_decline_rate": decline_rate,
            "predicted_harvest_date": predicted_date.strftime("%Y-%m-%d") if predicted_date else None,
            "days_until_harvest": days_to_harvest,
            "priority_score": priority_score,
            "status": status,
            "confidence": analysis["r_squared"]
        }
    
    def _calculate_priority_score(
        self,
        current_ndvi: float,
        decline_rate: float,
        days_to_harvest: Optional[int]
    ) -> int:
        """
        Calculate urgency priority score (1-10) for machine allocation.
        
        Scoring factors:
        - Lower current NDVI = higher priority (closer to harvest)
        - Faster decline rate = higher priority (will need attention soon)
        - Fewer days to harvest = higher priority
        
        Args:
            current_ndvi: Current NDVI value
            decline_rate: Daily NDVI decline rate (negative value)
            days_to_harvest: Predicted days until harvest-ready
            
        Returns:
            Priority score from 1 (low) to 10 (urgent)
        """
        score = 0
        
        # Factor 1: Current NDVI level (0-4 points)
        if current_ndvi <= 0.35:
            score += 4  # Very close to harvest
        elif current_ndvi <= 0.45:
            score += 3  # Near harvest
        elif current_ndvi <= 0.55:
            score += 2  # Approaching harvest
        elif current_ndvi <= 0.65:
            score += 1  # Still growing
        
        # Factor 2: Decline rate (0-3 points)
        if decline_rate <= -0.02:
            score += 3  # Rapid decline
        elif decline_rate <= -0.015:
            score += 2  # Moderate decline
        elif decline_rate <= -0.01:
            score += 1  # Slow decline
        
        # Factor 3: Days to harvest (0-3 points)
        if days_to_harvest is not None:
            if days_to_harvest <= 3:
                score += 3  # Imminent
            elif days_to_harvest <= 7:
                score += 2  # Soon
            elif days_to_harvest <= 14:
                score += 1  # Upcoming
        
        # Ensure score is within 1-10 range
        return max(1, min(10, score))
    
    def predict_all_districts(self) -> List[Dict]:
        """
        Generate harvest predictions for all districts in the dataset.
        
        Returns:
            List of prediction dictionaries, sorted by priority score (descending)
        """
        district_ids = self.ndvi_data['district_id'].unique()
        predictions = []
        
        for district_id in district_ids:
            prediction = self.predict_harvest_date(district_id)
            if prediction:
                predictions.append(prediction)
        
        # Sort by priority score (highest first)
        predictions.sort(key=lambda x: x['priority_score'], reverse=True)
        
        self.predictions = {p['district_id']: p for p in predictions}
        return predictions
    
    def get_urgent_districts(self, min_priority: int = 7) -> List[Dict]:
        """
        Get districts that require immediate attention.
        
        Args:
            min_priority: Minimum priority score to be considered urgent
            
        Returns:
            List of urgent district predictions
        """
        if not self.predictions:
            self.predict_all_districts()
        
        return [p for p in self.predictions.values() if p['priority_score'] >= min_priority]
    
    def to_json(self) -> str:
        """Export all predictions as JSON string."""
        if not self.predictions:
            self.predict_all_districts()
        return json.dumps(list(self.predictions.values()), indent=2)


if __name__ == "__main__":
    # Demo: Test the predictor with mock data
    from mock_data import generate_district_ndvi_data
    
    print("=" * 60)
    print("HARVEST PREDICTOR - Demo Run")
    print("=" * 60)
    
    # Generate mock NDVI data
    ndvi_df = generate_district_ndvi_data(30)
    
    # Initialize predictor
    predictor = HarvestPredictor(ndvi_df)
    
    # Get predictions for all districts
    predictions = predictor.predict_all_districts()
    
    print(f"\nPredictions for {len(predictions)} districts:\n")
    print("-" * 80)
    print(f"{'District':<15} {'State':<12} {'NDVI':<8} {'Rate/Day':<10} {'Harvest Date':<14} {'Priority'}")
    print("-" * 80)
    
    for p in predictions:
        print(f"{p['district_name']:<15} {p['state']:<12} {p['current_ndvi']:<8.3f} "
              f"{p['ndvi_decline_rate']:<10.4f} {p['predicted_harvest_date'] or 'N/A':<14} {p['priority_score']}/10")
    
    print("\n" + "=" * 60)
    print("URGENT DISTRICTS (Priority >= 7):")
    print("=" * 60)
    urgent = predictor.get_urgent_districts(7)
    for u in urgent:
        print(f"  ⚠️  {u['district_name']} ({u['state']}) - Priority: {u['priority_score']}/10")
