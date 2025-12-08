"""
AgriTrack AI Engine v2.0
- Anomaly Detection using Isolation Forest (trained on historical DB data)
- Predictive Maintenance using trend analysis
- Efficiency & Productivity Metrics from persisted data
- Real-time and historical analysis
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
import pandas as pd

app = FastAPI(
    title="AgriTrack AI Engine",
    description="Anomaly detection, predictive maintenance, and analytics for CRM machinery",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase: Optional[Client] = None

# ML Models
anomaly_model: Optional[IsolationForest] = None
scaler: Optional[StandardScaler] = None
model_trained_at: Optional[datetime] = None

# In-memory buffer for real-time data (supplement to DB)
realtime_buffer: List[dict] = []
MAX_BUFFER_SIZE = 5000


def get_supabase() -> Optional[Client]:
    """Get or create Supabase client"""
    global supabase
    if supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if url and key:
            supabase = create_client(url, key)
            print("✅ Connected to Supabase")
        else:
            print("⚠️ Supabase credentials not configured")
    return supabase


# ═══════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════

class SensorData(BaseModel):
    id: str
    temp: float
    vib_x: float
    vib_y: float
    vib_z: float
    speed: float
    timestamp: Optional[int] = None


class SensorBatch(BaseModel):
    data: List[SensorData]


class AnomalyResult(BaseModel):
    machine_id: str
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: Optional[str]
    details: str
    severity: str = "warning"


class PredictionResult(BaseModel):
    machine_id: str
    prediction_type: str
    predicted_value: float
    confidence: float
    time_horizon: str
    recommendation: str


class MaintenanceAlert(BaseModel):
    machine_id: str
    component: str
    risk_level: str  # low, medium, high, critical
    predicted_failure_days: Optional[int]
    recommendation: str
    confidence: float


# ═══════════════════════════════════════════════════════════════════
# HEALTH & UTILITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation"""
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health():
    db_connected = get_supabase() is not None
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database_connected": db_connected,
        "model_trained": anomaly_model is not None,
        "model_trained_at": model_trained_at.isoformat() if model_trained_at else None,
        "buffer_size": len(realtime_buffer)
    }


# ═══════════════════════════════════════════════════════════════════
# DATA INGESTION (Real-time supplement)
# ═══════════════════════════════════════════════════════════════════

@app.post("/ingest")
async def ingest_data(batch: SensorBatch):
    """Ingest real-time sensor data for immediate analysis"""
    global realtime_buffer
    
    for data in batch.data:
        realtime_buffer.append(data.dict())
        
    # Trim buffer if too large
    if len(realtime_buffer) > MAX_BUFFER_SIZE:
        realtime_buffer = realtime_buffer[-MAX_BUFFER_SIZE:]
        
    return {"ingested": len(batch.data), "buffer_size": len(realtime_buffer)}


# ═══════════════════════════════════════════════════════════════════
# MODEL TRAINING (from Database)
# ═══════════════════════════════════════════════════════════════════

@app.post("/train")
async def train_model(hours: int = Query(default=24, description="Hours of historical data to use")):
    """Train anomaly detection model on persisted sensor data from Supabase"""
    global anomaly_model, scaler, model_trained_at
    
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    # Fetch historical sensor logs
    since = (datetime.now() - timedelta(hours=hours)).isoformat()
    
    response = db.table('sensor_logs').select('*').gte('timestamp', since).limit(10000).execute()
    
    if not response.data or len(response.data) < 100:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient data for training. Found {len(response.data) if response.data else 0} records (need 100+)"
        )
    
    # Convert to DataFrame for easier manipulation
    df = pd.DataFrame(response.data)
    
    # Calculate features
    df['vib_magnitude'] = np.sqrt(
        df['vibration_x'].fillna(0)**2 + 
        df['vibration_y'].fillna(0)**2 + 
        df['vibration_z'].fillna(0)**2
    )
    
    features = df[['temperature', 'vib_magnitude', 'speed']].fillna(0).values
    
    # Scale features
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)
    
    # Train Isolation Forest
    anomaly_model = IsolationForest(
        contamination=0.05,  # Expect 5% anomalies
        random_state=42,
        n_estimators=150,
        max_samples='auto'
    )
    anomaly_model.fit(features_scaled)
    model_trained_at = datetime.now()
    
    print(f"✅ Model trained on {len(features)} samples from last {hours} hours")
    
    return {
        "status": "trained",
        "samples": len(features),
        "time_range_hours": hours,
        "trained_at": model_trained_at.isoformat()
    }


# ═══════════════════════════════════════════════════════════════════
# ANOMALY DETECTION
# ═══════════════════════════════════════════════════════════════════

@app.post("/detect", response_model=List[AnomalyResult])
async def detect_anomalies(batch: SensorBatch):
    """Detect anomalies in incoming sensor data using rules + ML"""
    
    results = []
    
    for data in batch.data:
        vib_magnitude = np.sqrt(data.vib_x**2 + data.vib_y**2 + data.vib_z**2)
        
        # Rule-based detection (always active)
        is_anomaly = False
        anomaly_type = None
        details = ""
        anomaly_score = 0.0
        severity = "warning"
        
        # Critical: Overheat
        if data.temp > 100:
            is_anomaly = True
            anomaly_type = "overheat_critical"
            details = f"CRITICAL: Temperature {data.temp}°C exceeds 100°C"
            anomaly_score = 1.0
            severity = "critical"
        elif data.temp > 90:
            is_anomaly = True
            anomaly_type = "overheat"
            details = f"Temperature {data.temp}°C exceeds 90°C threshold"
            anomaly_score = min(1.0, (data.temp - 90) / 30)
            severity = "warning"
            
        # High vibration - potential mechanical failure
        elif vib_magnitude > 0.7:
            is_anomaly = True
            anomaly_type = "vibration_critical"
            details = f"CRITICAL: Vibration {vib_magnitude:.3f} indicates mechanical failure"
            anomaly_score = 1.0
            severity = "critical"
        elif vib_magnitude > 0.5:
            is_anomaly = True
            anomaly_type = "vibration"
            details = f"High vibration {vib_magnitude:.3f} - check machinery"
            anomaly_score = min(1.0, vib_magnitude / 1.0)
            severity = "warning"
            
        # Idle detection (REQ-AI-01)
        elif data.speed < 1 and vib_magnitude > 0.02:
            is_anomaly = True
            anomaly_type = "idle"
            details = f"Machine idle with engine running (speed={data.speed}, vib={vib_magnitude:.3f})"
            anomaly_score = 0.3
            severity = "info"
            
        # ML-based detection (if model trained)
        if anomaly_model is not None and scaler is not None and not is_anomaly:
            features = np.array([[data.temp, vib_magnitude, data.speed]])
            features_scaled = scaler.transform(features)
            prediction = anomaly_model.predict(features_scaled)[0]
            score = -anomaly_model.score_samples(features_scaled)[0]
            
            if prediction == -1:  # Anomaly
                is_anomaly = True
                anomaly_type = "ml_detected"
                anomaly_score = min(1.0, score / 0.5)  # Normalize score
                details = f"ML model detected unusual pattern (score={score:.3f})"
                severity = "warning" if score < 0.3 else "critical"
                
        results.append(AnomalyResult(
            machine_id=data.id,
            is_anomaly=is_anomaly,
            anomaly_score=round(anomaly_score, 3),
            anomaly_type=anomaly_type,
            details=details,
            severity=severity
        ))
        
    return results


@app.get("/anomalies")
async def get_anomalies_from_db(
    hours: int = Query(default=24, description="Hours to look back"),
    limit: int = Query(default=100, description="Max results")
):
    """Get anomalies from persisted alerts in database"""
    
    db = get_supabase()
    if not db:
        # Fallback to buffer
        return _get_anomalies_from_buffer()
    
    since = (datetime.now() - timedelta(hours=hours)).isoformat()
    
    response = db.table('alerts').select(
        '*, machine:machines(device_id, name, type)'
    ).gte('created_at', since).order('created_at', desc=True).limit(limit).execute()
    
    return {
        "anomalies": response.data or [],
        "total": len(response.data) if response.data else 0,
        "time_range_hours": hours,
        "source": "database"
    }


def _get_anomalies_from_buffer():
    """Fallback: Get anomalies from in-memory buffer"""
    anomalies = []
    for data in realtime_buffer[-500:]:
        vib_magnitude = np.sqrt(data.get('vib_x', 0)**2 + data.get('vib_y', 0)**2 + data.get('vib_z', 0)**2)
        if data.get('temp', 0) > 90 or vib_magnitude > 0.5:
            anomalies.append({
                "machine_id": data.get('id'),
                "temp": data.get('temp'),
                "vibration": round(vib_magnitude, 4),
                "timestamp": data.get('timestamp'),
                "type": "overheat" if data.get('temp', 0) > 90 else "vibration"
            })
    return {"anomalies": anomalies[-50:], "total": len(anomalies), "source": "buffer"}


# ═══════════════════════════════════════════════════════════════════
# PREDICTIVE MAINTENANCE
# ═══════════════════════════════════════════════════════════════════

@app.get("/predict/maintenance", response_model=List[MaintenanceAlert])
async def predict_maintenance(
    machine_id: Optional[str] = Query(default=None, description="Specific machine or all")
):
    """Predict maintenance needs based on historical sensor trends"""
    
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=503, detail="Database required for predictions")
    
    # Get last 7 days of sensor data
    since = (datetime.now() - timedelta(days=7)).isoformat()
    
    query = db.table('sensor_logs').select('*').gte('timestamp', since)
    if machine_id:
        query = query.eq('device_id', machine_id)
    
    response = query.order('timestamp', desc=False).limit(5000).execute()
    
    if not response.data:
        return []
    
    df = pd.DataFrame(response.data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['vib_magnitude'] = np.sqrt(
        df['vibration_x'].fillna(0)**2 + 
        df['vibration_y'].fillna(0)**2 + 
        df['vibration_z'].fillna(0)**2
    )
    
    alerts = []
    
    # Analyze each machine
    for device_id in df['device_id'].unique():
        machine_df = df[df['device_id'] == device_id].copy()
        
        if len(machine_df) < 20:
            continue
        
        # Calculate time-based index for trend analysis
        machine_df['time_idx'] = range(len(machine_df))
        
        # Analyze temperature trend
        temp_alert = _analyze_trend(
            machine_df, 'temperature', device_id,
            warning_threshold=80, critical_threshold=95,
            component="Cooling System"
        )
        if temp_alert:
            alerts.append(temp_alert)
        
        # Analyze vibration trend
        vib_alert = _analyze_trend(
            machine_df, 'vib_magnitude', device_id,
            warning_threshold=0.3, critical_threshold=0.5,
            component="Mechanical Components"
        )
        if vib_alert:
            alerts.append(vib_alert)
    
    return alerts


def _analyze_trend(df: pd.DataFrame, column: str, device_id: str, 
                   warning_threshold: float, critical_threshold: float,
                   component: str) -> Optional[MaintenanceAlert]:
    """Analyze trend for a specific metric and predict maintenance needs"""
    
    values = df[column].dropna().values
    if len(values) < 10:
        return None
    
    # Calculate trend using linear regression
    X = np.arange(len(values)).reshape(-1, 1)
    y = values
    
    model = LinearRegression()
    model.fit(X, y)
    
    slope = model.coef_[0]
    current_value = values[-1]
    avg_value = np.mean(values[-20:])  # Recent average
    
    # Predict when threshold will be reached
    if slope > 0:
        steps_to_warning = (warning_threshold - current_value) / slope if slope > 0 else float('inf')
        steps_to_critical = (critical_threshold - current_value) / slope if slope > 0 else float('inf')
    else:
        return None  # Trend is stable or decreasing
    
    # Estimate days (assuming ~720 readings per day at 5s intervals)
    readings_per_day = 720
    days_to_warning = max(0, steps_to_warning / readings_per_day)
    days_to_critical = max(0, steps_to_critical / readings_per_day)
    
    # Determine risk level
    if current_value > critical_threshold:
        risk_level = "critical"
        recommendation = f"IMMEDIATE: {component} requires urgent attention"
        predicted_days = 0
    elif current_value > warning_threshold or days_to_critical < 3:
        risk_level = "high"
        recommendation = f"Schedule maintenance for {component} within 2-3 days"
        predicted_days = int(days_to_critical)
    elif days_to_warning < 7:
        risk_level = "medium"
        recommendation = f"Monitor {component} closely, maintenance may be needed soon"
        predicted_days = int(days_to_warning)
    else:
        return None  # No immediate concern
    
    confidence = min(0.95, 0.5 + (len(values) / 1000) * 0.45)  # More data = higher confidence
    
    return MaintenanceAlert(
        machine_id=device_id,
        component=component,
        risk_level=risk_level,
        predicted_failure_days=predicted_days,
        recommendation=recommendation,
        confidence=round(confidence, 2)
    )


@app.get("/predict/temperature/{machine_id}")
async def predict_temperature(
    machine_id: str,
    hours_ahead: int = Query(default=1, description="Hours to predict ahead")
):
    """Predict future temperature for a specific machine"""
    
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=503, detail="Database required")
    
    # Get recent data
    since = (datetime.now() - timedelta(hours=24)).isoformat()
    response = db.table('sensor_logs').select(
        'temperature, timestamp'
    ).eq('device_id', machine_id).gte('timestamp', since).order('timestamp').execute()
    
    if not response.data or len(response.data) < 20:
        raise HTTPException(status_code=400, detail="Insufficient data for prediction")
    
    df = pd.DataFrame(response.data)
    temps = df['temperature'].dropna().values
    
    # Simple linear prediction
    X = np.arange(len(temps)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X, temps)
    
    # Predict future
    steps_ahead = int(hours_ahead * 720)  # ~720 readings per hour at 5s interval
    future_X = np.array([[len(temps) + steps_ahead]])
    predicted_temp = model.predict(future_X)[0]
    
    # Calculate confidence based on variance
    variance = np.var(temps[-100:]) if len(temps) > 100 else np.var(temps)
    confidence = max(0.5, 1 - (variance / 100))
    
    return PredictionResult(
        machine_id=machine_id,
        prediction_type="temperature",
        predicted_value=round(predicted_temp, 1),
        confidence=round(confidence, 2),
        time_horizon=f"{hours_ahead} hours",
        recommendation="Monitor closely" if predicted_temp > 85 else "Normal operation expected"
    )


# ═══════════════════════════════════════════════════════════════════
# EFFICIENCY & ANALYTICS
# ═══════════════════════════════════════════════════════════════════

@app.get("/efficiency")
async def get_efficiency_metrics(
    hours: int = Query(default=24, description="Hours to analyze")
):
    """Calculate efficiency metrics from persisted sensor data"""
    
    db = get_supabase()
    
    if db:
        return await _efficiency_from_db(db, hours)
    else:
        return _efficiency_from_buffer()


async def _efficiency_from_db(db: Client, hours: int):
    """Calculate efficiency from database"""
    
    since = (datetime.now() - timedelta(hours=hours)).isoformat()
    
    response = db.table('sensor_logs').select(
        'device_id, speed, state, timestamp'
    ).gte('timestamp', since).execute()
    
    if not response.data:
        return {"message": "No data available", "source": "database"}
    
    df = pd.DataFrame(response.data)
    
    # Group by machine
    efficiencies = []
    for device_id in df['device_id'].unique():
        machine_df = df[df['device_id'] == device_id]
        
        total_readings = len(machine_df)
        active_readings = len(machine_df[machine_df['speed'] > 1])
        
        if total_readings > 0:
            efficiency = (active_readings / total_readings) * 100
            
            # Estimate distance (speed * time interval)
            avg_speed = machine_df[machine_df['speed'] > 0]['speed'].mean()
            estimated_hours = total_readings * 5 / 3600  # 5s per reading
            distance = avg_speed * estimated_hours if not np.isnan(avg_speed) else 0
            
            efficiencies.append({
                "machine_id": device_id,
                "efficiency": round(efficiency, 1),
                "active_readings": active_readings,
                "total_readings": total_readings,
                "estimated_distance_km": round(distance, 2),
                "operating_hours": round(estimated_hours, 2)
            })
    
    # Sort by efficiency
    efficiencies.sort(key=lambda x: x["efficiency"], reverse=True)
    
    avg_eff = np.mean([e["efficiency"] for e in efficiencies]) if efficiencies else 0
    
    return {
        "averageEfficiency": round(avg_eff, 1),
        "topPerformers": efficiencies[:5],
        "lowPerformers": efficiencies[-5:] if len(efficiencies) > 5 else [],
        "totalMachines": len(efficiencies),
        "timeRangeHours": hours,
        "source": "database"
    }


def _efficiency_from_buffer():
    """Fallback efficiency calculation from buffer"""
    if len(realtime_buffer) < 10:
        return {"message": "Insufficient data", "source": "buffer"}
    
    machine_data = {}
    for data in realtime_buffer:
        mid = data.get('id')
        if mid not in machine_data:
            machine_data[mid] = {"active": 0, "total": 0}
        machine_data[mid]["total"] += 1
        if data.get('speed', 0) > 1:
            machine_data[mid]["active"] += 1
    
    efficiencies = []
    for mid, stats in machine_data.items():
        if stats["total"] > 0:
            eff = (stats["active"] / stats["total"]) * 100
            efficiencies.append({"machine_id": mid, "efficiency": round(eff, 1)})
    
    efficiencies.sort(key=lambda x: x["efficiency"], reverse=True)
    avg = np.mean([e["efficiency"] for e in efficiencies]) if efficiencies else 0
    
    return {
        "averageEfficiency": round(avg, 1),
        "topPerformers": efficiencies[:5],
        "totalMachines": len(efficiencies),
        "source": "buffer"
    }


@app.get("/stats")
async def get_stats(hours: int = Query(default=24)):
    """Get comprehensive statistics from database"""
    
    db = get_supabase()
    
    if db:
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        response = db.table('sensor_logs').select('*').gte('timestamp', since).limit(5000).execute()
        
        if response.data:
            df = pd.DataFrame(response.data)
            
            temps = df['temperature'].dropna()
            speeds = df['speed'].dropna()
            df['vib_mag'] = np.sqrt(
                df['vibration_x'].fillna(0)**2 + 
                df['vibration_y'].fillna(0)**2 + 
                df['vibration_z'].fillna(0)**2
            )
            vibs = df['vib_mag']
            
            # Get alert counts
            alert_response = db.table('alerts').select('type').gte('created_at', since).execute()
            alert_counts = {}
            if alert_response.data:
                for alert in alert_response.data:
                    t = alert.get('type', 'unknown')
                    alert_counts[t] = alert_counts.get(t, 0) + 1
            
            return {
                "records_analyzed": len(df),
                "unique_machines": df['device_id'].nunique(),
                "time_range_hours": hours,
                "temperature": {
                    "min": round(temps.min(), 1) if len(temps) else 0,
                    "max": round(temps.max(), 1) if len(temps) else 0,
                    "avg": round(temps.mean(), 1) if len(temps) else 0,
                    "std": round(temps.std(), 2) if len(temps) else 0
                },
                "speed": {
                    "min": round(speeds.min(), 1) if len(speeds) else 0,
                    "max": round(speeds.max(), 1) if len(speeds) else 0,
                    "avg": round(speeds.mean(), 1) if len(speeds) else 0
                },
                "vibration": {
                    "min": round(vibs.min(), 4) if len(vibs) else 0,
                    "max": round(vibs.max(), 4) if len(vibs) else 0,
                    "avg": round(vibs.mean(), 4) if len(vibs) else 0
                },
                "alerts": alert_counts,
                "model_trained": anomaly_model is not None,
                "source": "database"
            }
    
    # Fallback to buffer
    return _stats_from_buffer()


def _stats_from_buffer():
    """Fallback stats from buffer"""
    if not realtime_buffer:
        return {"message": "No data available", "source": "buffer"}
    
    temps = [d.get('temp', 0) for d in realtime_buffer]
    speeds = [d.get('speed', 0) for d in realtime_buffer]
    vibs = [np.sqrt(d.get('vib_x', 0)**2 + d.get('vib_y', 0)**2 + d.get('vib_z', 0)**2) for d in realtime_buffer]
    
    return {
        "buffer_size": len(realtime_buffer),
        "unique_machines": len(set(d.get('id') for d in realtime_buffer)),
        "temperature": {"min": round(min(temps), 1), "max": round(max(temps), 1), "avg": round(np.mean(temps), 1)},
        "speed": {"min": round(min(speeds), 1), "max": round(max(speeds), 1), "avg": round(np.mean(speeds), 1)},
        "vibration": {"min": round(min(vibs), 4), "max": round(max(vibs), 4), "avg": round(np.mean(vibs), 4)},
        "model_trained": anomaly_model is not None,
        "source": "buffer"
    }


# ═══════════════════════════════════════════════════════════════════
# MACHINE INSIGHTS
# ═══════════════════════════════════════════════════════════════════

@app.get("/insights/{machine_id}")
async def get_machine_insights(
    machine_id: str,
    days: int = Query(default=7, description="Days of history to analyze")
):
    """Get comprehensive insights for a specific machine"""
    
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=503, detail="Database required")
    
    since = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Get machine info first
    machine_response = db.table('machines').select('*').eq('device_id', machine_id).single().execute()
    
    # Get sensor data
    sensor_response = db.table('sensor_logs').select('*').eq(
        'device_id', machine_id
    ).gte('timestamp', since).order('timestamp').execute()
    
    # Get alerts using machine UUID if available
    alert_response = None
    if machine_response.data:
        alert_response = db.table('alerts').select('*').eq(
            'machine_id', machine_response.data['id']
        ).gte('created_at', since).execute()
    
    if not sensor_response.data:
        raise HTTPException(status_code=404, detail=f"No data found for machine {machine_id}")
    
    df = pd.DataFrame(sensor_response.data)
    df['vib_magnitude'] = np.sqrt(
        df['vibration_x'].fillna(0)**2 + 
        df['vibration_y'].fillna(0)**2 + 
        df['vibration_z'].fillna(0)**2
    )
    
    # Calculate insights
    total_readings = len(df)
    active_readings = len(df[df['speed'] > 1])
    idle_readings = len(df[(df['speed'] < 1) & (df['vib_magnitude'] > 0.01)])
    off_readings = total_readings - active_readings - idle_readings
    
    # Time calculations (5s per reading)
    total_hours = total_readings * 5 / 3600
    active_hours = active_readings * 5 / 3600
    idle_hours = idle_readings * 5 / 3600
    
    # Health score (0-100)
    avg_temp = df['temperature'].mean()
    avg_vib = df['vib_magnitude'].mean()
    alert_count = len(alert_response.data) if alert_response and alert_response.data else 0
    
    health_score = 100
    health_score -= min(30, (avg_temp - 50) * 0.5) if avg_temp > 50 else 0
    health_score -= min(30, avg_vib * 60)
    health_score -= min(20, alert_count * 2)
    health_score = max(0, health_score)
    
    return {
        "machine_id": machine_id,
        "machine_info": machine_response.data if machine_response.data else None,
        "analysis_period_days": days,
        "total_readings": total_readings,
        "utilization": {
            "efficiency_percent": round((active_readings / total_readings) * 100, 1) if total_readings > 0 else 0,
            "active_hours": round(active_hours, 2),
            "idle_hours": round(idle_hours, 2),
            "off_hours": round((off_readings * 5 / 3600), 2),
            "total_monitored_hours": round(total_hours, 2)
        },
        "health": {
            "score": round(health_score, 1),
            "status": "Good" if health_score > 70 else "Fair" if health_score > 40 else "Poor",
            "alerts_count": alert_count
        },
        "metrics": {
            "avg_temperature": round(avg_temp, 1) if not np.isnan(avg_temp) else 0,
            "max_temperature": round(df['temperature'].max(), 1),
            "avg_vibration": round(avg_vib, 4) if not np.isnan(avg_vib) else 0,
            "max_vibration": round(df['vib_magnitude'].max(), 4),
            "avg_speed_when_active": round(df[df['speed'] > 1]['speed'].mean(), 1) if len(df[df['speed'] > 1]) > 0 else 0
        },
        "recent_alerts": alert_response.data[:10] if alert_response and alert_response.data else []
    }


# ═══════════════════════════════════════════════════════════════════
# FLEET OVERVIEW
# ═══════════════════════════════════════════════════════════════════

@app.get("/fleet/overview")
async def get_fleet_overview():
    """Get overview of entire fleet health and status"""
    
    db = get_supabase()
    if not db:
        raise HTTPException(status_code=503, detail="Database required")
    
    # Get all machines
    machines_response = db.table('machines').select('*').execute()
    
    # Get recent alerts (last 24 hours)
    since = (datetime.now() - timedelta(hours=24)).isoformat()
    alerts_response = db.table('alerts').select('machine_id, type, severity').gte('created_at', since).execute()
    
    # Get recent sensor data summary
    sensor_response = db.table('sensor_logs').select(
        'device_id, temperature, speed'
    ).gte('timestamp', since).execute()
    
    machines = machines_response.data or []
    alerts = alerts_response.data or []
    sensors = sensor_response.data or []
    
    # Count alerts by machine
    alert_counts = {}
    critical_machines = set()
    for alert in alerts:
        mid = alert.get('machine_id')
        alert_counts[mid] = alert_counts.get(mid, 0) + 1
        if alert.get('severity') == 'critical':
            critical_machines.add(mid)
    
    # Calculate active machines
    active_devices = set()
    if sensors:
        df = pd.DataFrame(sensors)
        active_devices = set(df[df['speed'] > 1]['device_id'].unique())
    
    return {
        "total_machines": len(machines),
        "active_machines": len(active_devices),
        "machines_with_alerts": len(alert_counts),
        "critical_alerts": len(critical_machines),
        "total_alerts_24h": len(alerts),
        "fleet_health": "Good" if len(critical_machines) == 0 else "At Risk" if len(critical_machines) < 3 else "Critical",
        "machines_by_status": _count_by_field(machines, 'status'),
        "machines_by_type": _count_by_field(machines, 'type'),
        "alerts_by_type": _count_by_field(alerts, 'type')
    }


def _count_by_field(items: List[dict], field: str) -> Dict[str, int]:
    """Count items by a specific field"""
    counts = {}
    for item in items:
        val = item.get(field, 'unknown')
        counts[val] = counts.get(val, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    """Initialize on startup"""
    get_supabase()
    print("🤖 AgriTrack AI Engine v2.0 started")
    print("   - Anomaly Detection: Rule-based + ML (Isolation Forest)")
    print("   - Predictive Maintenance: Trend Analysis")
    print("   - Data Source: Supabase PostgreSQL")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
