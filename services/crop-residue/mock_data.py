"""
Mock Data Generator for Crop Residue Management System
=======================================================
Generates realistic NDVI time-series data for districts in Punjab, Haryana, and nearby regions.

NDVI (Normalized Difference Vegetation Index) Formula:
    NDVI = (NIR - Red) / (NIR + Red)
    
Where:
    - NIR: Near-Infrared band (~842nm) - Healthy plants reflect strongly
    - Red: Red band (~665nm) - Healthy plants absorb for photosynthesis

NDVI Value Interpretation:
    - 0.8 to 1.0: Dense, healthy vegetation (peak growth)
    - 0.6 to 0.8: Healthy crops (maturing)
    - 0.4 to 0.6: Stressed/yellowing vegetation (near harvest)
    - 0.2 to 0.4: Sparse vegetation or harvested fields
    - < 0.2: Bare soil, water, or non-vegetated areas
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict


# District data for Punjab, Haryana, Delhi-NCR region
DISTRICTS = [
    {"id": "PB_001", "name": "Amritsar", "state": "Punjab", "lat": 31.6340, "lon": 74.8723},
    {"id": "PB_002", "name": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lon": 75.8573},
    {"id": "PB_003", "name": "Patiala", "state": "Punjab", "lat": 30.3398, "lon": 76.3869},
    {"id": "PB_004", "name": "Jalandhar", "state": "Punjab", "lat": 31.3260, "lon": 75.5762},
    {"id": "PB_005", "name": "Sangrur", "state": "Punjab", "lat": 30.2331, "lon": 75.8445},
    {"id": "HR_001", "name": "Karnal", "state": "Haryana", "lat": 29.6857, "lon": 76.9905},
    {"id": "HR_002", "name": "Kurukshetra", "state": "Haryana", "lat": 29.9695, "lon": 76.8783},
    {"id": "HR_003", "name": "Ambala", "state": "Haryana", "lat": 30.3782, "lon": 76.7767},
    {"id": "CH_001", "name": "Chandigarh", "state": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    {"id": "DL_001", "name": "Delhi-NCR", "state": "Delhi", "lat": 28.7041, "lon": 77.1025},
]

# Available machines for stubble management
MACHINES = [
    {"id": "HS_001", "type": "Happy Seeder", "capacity_acres_per_day": 10, "lat": 31.5, "lon": 75.0, "available": True},
    {"id": "HS_002", "type": "Happy Seeder", "capacity_acres_per_day": 10, "lat": 30.5, "lon": 76.0, "available": True},
    {"id": "HS_003", "type": "Happy Seeder", "capacity_acres_per_day": 10, "lat": 29.8, "lon": 76.5, "available": True},
    {"id": "BL_001", "type": "Baler", "capacity_acres_per_day": 15, "lat": 31.0, "lon": 75.5, "available": True},
    {"id": "BL_002", "type": "Baler", "capacity_acres_per_day": 15, "lat": 30.0, "lon": 76.8, "available": True},
    {"id": "SMS_001", "type": "Super SMS", "capacity_acres_per_day": 12, "lat": 30.8, "lon": 75.2, "available": True},
    {"id": "SMS_002", "type": "Super SMS", "capacity_acres_per_day": 12, "lat": 29.5, "lon": 77.0, "available": True},
    {"id": "RT_001", "type": "Rotavator", "capacity_acres_per_day": 8, "lat": 31.2, "lon": 74.9, "available": True},
]


def generate_ndvi_timeseries(
    num_days: int = 30,
    start_ndvi: float = None,
    decline_rate: float = None,
    noise_factor: float = 0.02
) -> List[float]:
    """
    Generate realistic NDVI time-series data simulating crop maturation and harvest readiness.
    
    The NDVI naturally declines as crops mature and approach harvest:
    - Rice crops start with high NDVI (~0.7-0.85) during peak growth
    - NDVI gradually decreases as plants yellow and dry
    - Harvest-ready crops have NDVI below 0.4
    
    Args:
        num_days: Number of days of data to generate
        start_ndvi: Initial NDVI value (default: random 0.65-0.85)
        decline_rate: Daily decline rate (default: random 0.008-0.025)
        noise_factor: Random noise amplitude
    
    Returns:
        List of NDVI values for each day
    """
    if start_ndvi is None:
        start_ndvi = np.random.uniform(0.65, 0.85)
    
    if decline_rate is None:
        # Different districts have different crop maturity rates
        decline_rate = np.random.uniform(0.008, 0.025)
    
    ndvi_values = []
    current_ndvi = start_ndvi
    
    for day in range(num_days):
        # Add realistic noise (weather, sensor variation)
        noise = np.random.normal(0, noise_factor)
        
        # NDVI naturally declines as crop matures
        current_ndvi = current_ndvi - decline_rate + noise
        
        # Clamp to valid NDVI range [0, 1]
        current_ndvi = max(0.1, min(1.0, current_ndvi))
        
        ndvi_values.append(round(current_ndvi, 4))
    
    return ndvi_values


def generate_district_ndvi_data(num_days: int = 30) -> pd.DataFrame:
    """
    Generate NDVI time-series data for all districts.
    
    Returns:
        DataFrame with columns: date, district_id, district_name, state, lat, lon, ndvi
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=num_days - 1)
    dates = [start_date + timedelta(days=i) for i in range(num_days)]
    
    records = []
    
    for district in DISTRICTS:
        # Generate unique NDVI pattern for each district
        ndvi_series = generate_ndvi_timeseries(num_days)
        
        for i, date in enumerate(dates):
            records.append({
                "date": date.strftime("%Y-%m-%d"),
                "district_id": district["id"],
                "district_name": district["name"],
                "state": district["state"],
                "lat": district["lat"],
                "lon": district["lon"],
                "ndvi": ndvi_series[i]
            })
    
    return pd.DataFrame(records)


def get_machines_data() -> List[Dict]:
    """Return the list of available machines with their details."""
    return MACHINES.copy()


def get_districts_data() -> List[Dict]:
    """Return the list of districts with their details."""
    return DISTRICTS.copy()


if __name__ == "__main__":
    # Demo: Generate and display sample data
    print("=" * 60)
    print("MOCK DATA GENERATOR - Crop Residue Management System")
    print("=" * 60)
    
    df = generate_district_ndvi_data(30)
    print(f"\nGenerated {len(df)} NDVI records for {len(DISTRICTS)} districts over 30 days")
    print("\nSample data (last 5 days for Amritsar):")
    print(df[df["district_name"] == "Amritsar"].tail())
    
    print(f"\nAvailable machines: {len(MACHINES)}")
    for m in MACHINES[:3]:
        print(f"  - {m['id']}: {m['type']} at ({m['lat']}, {m['lon']})")
