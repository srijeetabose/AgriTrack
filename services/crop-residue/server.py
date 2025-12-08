"""
FastAPI Server for Crop Residue Management System
=================================================
Exposes REST API endpoints for harvest predictions, machine allocations,
and dynamic harvest scheduling system.
All data is generated dynamically - no hardcoded responses.

Endpoints:
    GET  /api/health          - Health check
    GET  /api/districts       - List all districts with current NDVI
    GET  /api/predictions     - Get harvest predictions for all districts
    GET  /api/allocations     - Get machine allocations
    GET  /api/machines        - List all available machines
    GET  /api/urgent          - Get urgent districts only (priority >= 7)
    GET  /api/dashboard       - Complete dashboard data
    
    # Scheduling Endpoints (NEW)
    GET  /api/scheduling/clusters      - Get harvest clusters
    GET  /api/scheduling/schedules     - Get farmer schedules  
    GET  /api/scheduling/gantt         - Gantt chart data
    GET  /api/scheduling/heatmap       - Machine availability heatmap
    GET  /api/scheduling/summary       - Scheduling summary
    GET  /api/scheduling/dashboard     - Complete scheduling dashboard
    GET  /api/scheduling/sms/preview   - Preview SMS messages
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime
from dataclasses import asdict
import json

# Import our prediction modules
from mock_data import generate_district_ndvi_data, get_machines_data, get_districts_data, DISTRICTS
from harvest_predictor import HarvestPredictor
from machine_allocator import MachineAllocator
from harvest_scheduler import HarvestScheduler

# Initialize FastAPI app
app = FastAPI(
    title="Crop Residue Management API",
    description="Satellite-based harvest prediction, machine allocation, and dynamic scheduling for Punjab, Haryana, Delhi-NCR. Designed to normalize machine demand and prevent stubble burning.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Next.js frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════
# DYNAMIC DATA GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def get_fresh_predictions(num_days: int = 30) -> tuple:
    """
    Generate fresh NDVI data and predictions dynamically.
    Called on each request to ensure data is current.
    
    Returns:
        Tuple of (predictor, predictions_list)
    """
    # Generate new NDVI time-series data
    ndvi_data = generate_district_ndvi_data(num_days=num_days)
    
    # Create predictor and run analysis
    predictor = HarvestPredictor(ndvi_data)
    predictions = predictor.predict_all_districts()
    
    return predictor, predictions


def get_fresh_allocations(predictions: List[dict]) -> tuple:
    """
    Generate fresh machine allocations based on current predictions.
    
    Args:
        predictions: List of prediction dictionaries
        
    Returns:
        Tuple of (allocator, allocations_list, summary)
    """
    # Get fresh machine data (all available)
    machines = get_machines_data()
    
    # Run allocation algorithm
    allocator = MachineAllocator(machines, predictions)
    allocations = allocator.allocate_machines()
    summary = allocator.get_allocation_summary()
    
    return allocator, allocations, summary


def get_fresh_scheduler(predictions: List[dict]) -> HarvestScheduler:
    """
    Generate fresh scheduler with clusters and farmer assignments.
    
    Args:
        predictions: List of prediction dictionaries
        
    Returns:
        HarvestScheduler instance with clusters and schedules populated
    """
    machines = get_machines_data()
    scheduler = HarvestScheduler(predictions, machines)
    scheduler.create_clusters()
    scheduler.assign_farmers_to_clusters()
    return scheduler


from fastapi.responses import RedirectResponse

# ═══════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "crop-residue-api"
    }


@app.get("/api/districts")
async def get_districts():
    """
    Get all districts with their basic information and latest NDVI.
    Data is generated dynamically.
    """
    # Generate fresh NDVI data
    ndvi_data = generate_district_ndvi_data(num_days=30)
    
    # Get latest NDVI for each district
    districts_with_ndvi = []
    for district in get_districts_data():
        district_ndvi = ndvi_data[ndvi_data['district_id'] == district['id']]
        latest_ndvi = district_ndvi.iloc[-1]['ndvi'] if len(district_ndvi) > 0 else None
        
        districts_with_ndvi.append({
            **district,
            "current_ndvi": round(latest_ndvi, 4) if latest_ndvi else None,
            "last_updated": datetime.now().isoformat()
        })
    
    return {
        "count": len(districts_with_ndvi),
        "generated_at": datetime.now().isoformat(),
        "districts": districts_with_ndvi
    }


@app.get("/api/predictions")
async def get_predictions(
    num_days: int = Query(default=30, ge=7, le=90, description="Days of NDVI history to analyze"),
    min_priority: Optional[int] = Query(default=None, ge=1, le=10, description="Filter by minimum priority")
):
    """
    Get harvest predictions for all districts.
    Predictions are generated dynamically based on simulated NDVI data.
    
    Query Parameters:
        - num_days: Number of days of NDVI history to analyze (7-90)
        - min_priority: Filter to show only districts with this priority or higher
    """
    # Generate fresh predictions
    predictor, predictions = get_fresh_predictions(num_days)
    
    # Apply priority filter if specified
    if min_priority:
        predictions = [p for p in predictions if p['priority_score'] >= min_priority]
    
    return {
        "count": len(predictions),
        "analysis_days": num_days,
        "generated_at": datetime.now().isoformat(),
        "harvest_threshold": HarvestPredictor.HARVEST_THRESHOLD,
        "predictions": predictions
    }


@app.get("/api/allocations")
async def get_allocations(
    num_days: int = Query(default=30, ge=7, le=90, description="Days of NDVI history")
):
    """
    Get machine allocations for all districts.
    Allocations are computed dynamically using greedy algorithm.
    """
    # Generate fresh predictions first
    _, predictions = get_fresh_predictions(num_days)
    
    # Generate fresh allocations
    allocator, allocations, summary = get_fresh_allocations(predictions)
    
    return {
        "generated_at": datetime.now().isoformat(),
        "algorithm": "greedy_nearest_machine",
        "allocations": allocations,
        "unallocated": allocator.unallocated_districts,
        "summary": summary
    }


@app.get("/api/machines")
async def get_machines():
    """
    Get all available machines with their details.
    Returns fresh machine data on each request.
    """
    machines = get_machines_data()
    
    # Group by type
    by_type = {}
    for m in machines:
        mt = m['type']
        if mt not in by_type:
            by_type[mt] = []
        by_type[mt].append(m)
    
    return {
        "count": len(machines),
        "generated_at": datetime.now().isoformat(),
        "machines": machines,
        "by_type": by_type
    }


@app.get("/api/urgent")
async def get_urgent_districts(
    threshold: int = Query(default=7, ge=1, le=10, description="Minimum priority score for urgent status")
):
    """
    Get only urgent districts that need immediate attention.
    Dynamically filters based on priority threshold.
    """
    # Generate fresh predictions
    _, predictions = get_fresh_predictions(30)
    
    # Filter urgent
    urgent = [p for p in predictions if p['priority_score'] >= threshold]
    
    return {
        "count": len(urgent),
        "threshold": threshold,
        "generated_at": datetime.now().isoformat(),
        "urgent_districts": urgent
    }


@app.get("/api/dashboard")
async def get_dashboard_data():
    """
    Get all data needed for the dashboard in a single request.
    Combines predictions, allocations, and summary statistics.
    This is the main endpoint for the Next.js frontend.
    """
    # Generate fresh predictions
    predictor, predictions = get_fresh_predictions(30)
    
    # Generate fresh allocations
    allocator, allocations, summary = get_fresh_allocations(predictions)
    
    # Get machines data
    machines = get_machines_data()
    
    # Calculate additional statistics
    urgent_count = len([p for p in predictions if p['priority_score'] >= 7])
    avg_ndvi = sum(p['current_ndvi'] for p in predictions) / len(predictions) if predictions else 0
    harvest_ready = len([p for p in predictions if p['status'] == 'HARVEST_READY'])
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "region": "Punjab, Haryana, Chandigarh, Delhi-NCR",
            "analysis_days": 30
        },
        "statistics": {
            "total_districts": len(predictions),
            "urgent_districts": urgent_count,
            "harvest_ready": harvest_ready,
            "average_ndvi": round(avg_ndvi, 4),
            "total_machines": len(machines),
            "machines_allocated": summary['districts_allocated'],
            "allocation_rate": summary['allocation_rate'],
            "total_travel_km": summary['total_travel_distance_km']
        },
        "predictions": predictions,
        "allocations": allocations,
        "unallocated": allocator.unallocated_districts,
        "machines": machines,
        "summary": summary
    }


@app.get("/api/ndvi-history/{district_id}")
async def get_ndvi_history(
    district_id: str,
    num_days: int = Query(default=30, ge=7, le=90)
):
    """
    Get NDVI time-series history for a specific district.
    Useful for displaying trend charts.
    """
    # Generate NDVI data
    ndvi_data = generate_district_ndvi_data(num_days=num_days)
    
    # Filter for specific district
    district_data = ndvi_data[ndvi_data['district_id'] == district_id]
    
    if len(district_data) == 0:
        raise HTTPException(status_code=404, detail=f"District {district_id} not found")
    
    # Convert to list of records
    history = district_data[['date', 'ndvi']].to_dict(orient='records')
    
    # Get district info
    district_info = district_data.iloc[0]
    
    return {
        "district_id": district_id,
        "district_name": district_info['district_name'],
        "state": district_info['state'],
        "num_days": num_days,
        "generated_at": datetime.now().isoformat(),
        "history": history
    }


# ═══════════════════════════════════════════════════════════════════════════
# SCHEDULING API ENDPOINTS (Dynamic Harvest Scheduler)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/scheduling/clusters", tags=["Scheduling"])
async def get_scheduling_clusters():
    """
    Get harvest clusters for the scheduling system.
    Clusters group districts with similar harvest timing to normalize machine demand.
    
    Each cluster represents a 5-day harvest window with allocated machines.
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    clusters_data = []
    for cluster in scheduler.clusters:
        clusters_data.append({
            "id": cluster.id,
            "name": cluster.name,
            "region": cluster.region,
            "districts": cluster.districts,
            "district_ids": cluster.district_ids,
            "window_start": cluster.window_start.isoformat(),
            "window_end": cluster.window_end.isoformat(),
            "avg_ndvi": cluster.avg_ndvi,
            "priority_score": cluster.priority_score,
            "machines_required": cluster.machines_required,
            "machines_allocated": cluster.machines_allocated,
            "total_acres": cluster.total_acres,
            "farmers_count": len(cluster.farmers),
            "status": cluster.status,
            "season": cluster.season
        })
    
    return {
        "generated_at": datetime.now().isoformat(),
        "season": "Kharif 2025",
        "total_clusters": len(clusters_data),
        "clusters": clusters_data
    }


@app.get("/api/scheduling/schedules", tags=["Scheduling"])
async def get_farmer_schedules(
    district: Optional[str] = Query(default=None, description="Filter by district name"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    priority: Optional[str] = Query(default=None, description="Filter by priority level"),
    limit: int = Query(default=100, ge=1, le=500, description="Max results")
):
    """
    Get individual farmer schedules.
    Each farmer is assigned to a specific harvest window based on their field's NDVI data.
    
    Priority levels:
    - normal: Standard farmers
    - priority: Farmers with 15+ acres
    - premium: Farmers with 25+ acres (get first access to machines)
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    schedules_data = []
    for schedule in scheduler.schedules:
        if district and schedule.district.lower() != district.lower():
            continue
        if status and schedule.status != status:
            continue
        if priority and schedule.priority_level != priority:
            continue
        if len(schedules_data) >= limit:
            break
            
        schedules_data.append({
            "farmer_id": schedule.farmer_id,
            "farmer_name": schedule.farmer_name,
            "phone": schedule.phone,
            "district": schedule.district,
            "field_id": schedule.field_id,
            "field_acres": schedule.field_acres,
            "crop_type": schedule.crop_type,
            "current_ndvi": schedule.current_ndvi,
            "cluster_id": schedule.cluster_id,
            "cluster_name": schedule.cluster_name,
            "assigned_window_start": schedule.assigned_window_start.isoformat(),
            "assigned_window_end": schedule.assigned_window_end.isoformat(),
            "optimal_harvest_date": schedule.optimal_harvest_date.isoformat(),
            "priority_level": schedule.priority_level,
            "priority_booking_enabled": schedule.priority_booking_enabled,
            "status": schedule.status,
            "season": schedule.season
        })
    
    return {
        "generated_at": datetime.now().isoformat(),
        "total_schedules": len(schedules_data),
        "filters": {
            "district": district,
            "status": status,
            "priority": priority
        },
        "schedules": schedules_data
    }


@app.get("/api/scheduling/gantt", tags=["Scheduling"])
async def get_gantt_chart_data():
    """
    Get data for Gantt chart visualization on admin dashboard.
    Shows clusters as time-based bars with machine allocation info.
    
    Used for the "Scheduling Command Center" view.
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    return {
        "generated_at": datetime.now().isoformat(),
        "season": "Kharif 2025",
        "gantt_data": scheduler.get_gantt_chart_data()
    }


@app.get("/api/scheduling/heatmap", tags=["Scheduling"])
async def get_machine_heatmap():
    """
    Get machine availability heatmap data.
    Shows machines available per date per district.
    
    Useful for visualizing demand vs capacity across time.
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    return {
        "generated_at": datetime.now().isoformat(),
        "season": "Kharif 2025",
        "heatmap_data": scheduler.get_machine_availability_matrix()
    }


@app.get("/api/scheduling/summary", tags=["Scheduling"])
async def get_scheduling_summary():
    """
    Get scheduling summary with key statistics.
    Overview of the entire scheduling system's state.
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    return {
        "generated_at": datetime.now().isoformat(),
        "summary": scheduler.get_summary()
    }


@app.get("/api/scheduling/dashboard", tags=["Scheduling"])
async def get_scheduling_dashboard():
    """
    Get complete scheduling dashboard data in a single request.
    Combines all scheduling data for the admin "Scheduling Command Center".
    
    This is the main endpoint for the scheduling dashboard UI.
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "region": "Punjab, Haryana, Chandigarh, Delhi-NCR",
            "season": "Kharif 2025"
        },
        "summary": scheduler.get_summary(),
        "clusters": [
            {
                "id": c.id,
                "name": c.name,
                "region": c.region,
                "districts": c.districts,
                "window_start": c.window_start.isoformat(),
                "window_end": c.window_end.isoformat(),
                "avg_ndvi": c.avg_ndvi,
                "priority_score": c.priority_score,
                "machines_required": c.machines_required,
                "machines_allocated": c.machines_allocated,
                "total_acres": c.total_acres,
                "farmers_count": len(c.farmers),
                "status": c.status
            }
            for c in scheduler.clusters
        ],
        "gantt_data": scheduler.get_gantt_chart_data(),
        "heatmap_data": scheduler.get_machine_availability_matrix()
    }


@app.get("/api/scheduling/sms/preview", tags=["Scheduling", "SMS"])
async def preview_sms_messages(
    message_type: str = Query(
        default="schedule_assigned",
        description="Type of SMS message",
        enum=["schedule_assigned", "reminder_3day", "booking_open", "incentive_earned"]
    ),
    limit: int = Query(default=10, ge=1, le=100, description="Number of messages to preview")
):
    """
    Preview SMS messages that would be sent to farmers.
    Does NOT actually send messages - for admin review only.
    
    Message Types:
    - schedule_assigned: Initial window assignment notification
    - reminder_3day: Reminder 3 days before window
    - booking_open: When booking window opens
    - incentive_earned: Green credits notification
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    messages = scheduler.generate_sms_messages(message_type)
    
    # Convert to serializable format
    messages_data = [
        {
            "farmer_id": m.farmer_id,
            "schedule_id": m.schedule_id,
            "phone": m.phone,
            "message_type": m.message_type,
            "message_content": m.message_content,
            "language": m.language,
            "priority": m.priority,
            "char_count": len(m.message_content),
            "sms_segments": (len(m.message_content) // 160) + 1
        }
        for m in messages[:limit]
    ]
    
    return {
        "generated_at": datetime.now().isoformat(),
        "message_type": message_type,
        "total_messages": len(messages),
        "preview_count": len(messages_data),
        "estimated_cost_inr": len(messages) * 0.25,  # ~₹0.25 per SMS
        "preview": messages_data
    }


@app.get("/api/scheduling/district/{district_id}", tags=["Scheduling"])
async def get_district_schedule(district_id: str):
    """
    Get scheduling details for a specific district.
    Shows which cluster the district belongs to and all farmers in it.
    """
    _, predictions = get_fresh_predictions(30)
    scheduler = get_fresh_scheduler(predictions)
    
    result = scheduler.get_district_schedule(district_id)
    
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    
    return {
        "generated_at": datetime.now().isoformat(),
        **result
    }


# ═══════════════════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("\n🌾 Starting Crop Residue Management API Server...")
    print("📡 Endpoints available at http://localhost:8001")
    print("📖 API Documentation at http://localhost:8001/docs")
    print("📅 Scheduling API at http://localhost:8001/api/scheduling/dashboard")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
