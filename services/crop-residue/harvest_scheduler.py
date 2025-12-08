"""
Dynamic Harvest Scheduler Engine
================================
Clusters farmers into harvest windows based on NDVI predictions
and machine availability to normalize demand curve.

Core Algorithm:
1. Get NDVI predictions for all districts
2. Sort by predicted harvest date
3. Group into clusters based on:
   - Geographic proximity
   - Harvest date similarity
   - Machine availability
4. Assign time windows to each cluster
5. Generate farmer schedules
6. Create SMS advisory messages

Author: AgriTrack Team
Version: 1.0.0
"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict, field
import json

from harvest_predictor import HarvestPredictor
from mock_data import generate_district_ndvi_data, get_machines_data, DISTRICTS


@dataclass
class HarvestCluster:
    """Represents a group of farmers/districts with similar harvest timing."""
    id: str
    name: str
    region: str
    districts: List[str]
    district_ids: List[str]
    window_start: datetime
    window_end: datetime
    avg_ndvi: float
    priority_score: int
    machines_required: int
    machines_allocated: int
    total_acres: float = 0.0
    farmers: List[Dict] = field(default_factory=list)
    status: str = 'pending'
    season: str = 'Kharif 2025'
    crop_type: str = 'rice'


@dataclass
class FarmerSchedule:
    """Individual farmer's assigned harvest schedule."""
    farmer_id: str
    farmer_name: str
    phone: str
    district: str
    district_id: str
    field_id: Optional[str]
    field_acres: float
    crop_type: str
    current_ndvi: float
    cluster_id: str
    cluster_name: str
    assigned_window_start: datetime
    assigned_window_end: datetime
    optimal_harvest_date: datetime
    priority_level: str  # 'normal', 'priority', 'premium'
    priority_booking_enabled: bool
    status: str  # 'scheduled', 'notified', 'accepted', etc.
    season: str = 'Kharif 2025'


@dataclass
class SMSMessage:
    """Advisory SMS message to be sent to farmer."""
    farmer_id: str
    schedule_id: str
    phone: str
    message_type: str
    message_content: str
    language: str
    priority: str


class HarvestScheduler:
    """
    Dynamic Harvest Scheduler that normalizes machine demand
    by distributing farmers into time-based clusters.
    
    The goal is to prevent all farmers from harvesting on the same day,
    which causes machine shortages and leads to stubble burning.
    """
    
    # Configuration
    CLUSTER_WINDOW_DAYS = 5          # Each cluster spans 5 days
    MIN_MACHINES_PER_CLUSTER = 3     # Minimum machines needed per cluster
    MAX_OVERLAP_PERCENTAGE = 0.3     # Max 30% overlap between clusters
    ACRES_PER_MACHINE_PER_DAY = 10   # Average machine capacity (acres/day)
    SEASON = 'Kharif 2025'
    
    # Priority thresholds
    PRIORITY_ACRES_THRESHOLD = 15    # Farmers with >15 acres get priority
    PREMIUM_ACRES_THRESHOLD = 25     # Farmers with >25 acres get premium
    
    def __init__(
        self,
        predictions: List[Dict],
        machines: List[Dict],
        farmers: List[Dict] = None
    ):
        """
        Initialize scheduler with prediction data and machine availability.
        
        Args:
            predictions: List of district predictions from HarvestPredictor
            machines: List of available machines
            farmers: Optional list of registered farmers with their fields
        """
        self.predictions = sorted(
            predictions,
            key=lambda x: (x.get('predicted_harvest_date') or '9999-12-31', -x.get('priority_score', 0))
        )
        self.machines = machines
        self.farmers = farmers or self._generate_mock_farmers()
        self.clusters: List[HarvestCluster] = []
        self.schedules: List[FarmerSchedule] = []
        self._district_prediction_map = {p['district_id']: p for p in predictions}
        
    def _generate_mock_farmers(self) -> List[Dict]:
        """Generate mock farmer data for simulation."""
        farmers = []
        farmer_id = 1
        
        for district in DISTRICTS:
            # 5-15 farmers per district based on district size
            num_farmers = 5 + (hash(district['id']) % 11)
            
            for i in range(num_farmers):
                # Vary farm sizes realistically (2-30 acres)
                base_acres = 5 + (farmer_id % 20)
                
                farmers.append({
                    'id': f"farmer_{farmer_id:04d}",
                    'name': f"Farmer {farmer_id}",
                    'phone': f"+9198765{farmer_id:05d}",
                    'district': district['name'],
                    'district_id': district['id'],
                    'state': district['state'],
                    'field_id': f"field_{farmer_id:04d}",
                    'field_acres': base_acres,
                    'crop_type': 'rice',
                    'lat': district['lat'] + (i * 0.01),
                    'lon': district['lon'] + (i * 0.01),
                    'preferred_language': 'hindi' if farmer_id % 3 != 0 else 'english'
                })
                farmer_id += 1
                
        return farmers
    
    def create_clusters(self) -> List[HarvestCluster]:
        """
        Create harvest clusters based on NDVI predictions.
        Groups districts with similar harvest dates together.
        
        Returns:
            List of HarvestCluster objects
        """
        self.clusters = []
        
        # Filter predictions with valid harvest dates
        valid_predictions = [
            p for p in self.predictions 
            if p.get('predicted_harvest_date') and p.get('status') != 'NOT_DECLINING'
        ]
        
        if not valid_predictions:
            return self.clusters
        
        # Sort by predicted harvest date
        sorted_preds = sorted(
            valid_predictions,
            key=lambda x: x['predicted_harvest_date']
        )
        
        # Get date range
        first_date = datetime.strptime(sorted_preds[0]['predicted_harvest_date'], '%Y-%m-%d')
        last_date = datetime.strptime(sorted_preds[-1]['predicted_harvest_date'], '%Y-%m-%d')
        
        # Create time windows
        current_date = first_date
        cluster_num = 0
        cluster_letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        
        while current_date <= last_date:
            window_end = current_date + timedelta(days=self.CLUSTER_WINDOW_DAYS)
            
            # Find districts in this window
            districts_in_window = [
                p for p in sorted_preds
                if current_date <= datetime.strptime(p['predicted_harvest_date'], '%Y-%m-%d') < window_end
            ]
            
            if districts_in_window:
                cluster_num += 1
                cluster_letter = cluster_letters[(cluster_num - 1) % 26]
                
                # Calculate cluster statistics
                avg_ndvi = sum(d['current_ndvi'] for d in districts_in_window) / len(districts_in_window)
                avg_priority = sum(d['priority_score'] for d in districts_in_window) / len(districts_in_window)
                
                # Get unique regions
                regions = list(set(d['state'] for d in districts_in_window))
                
                # Get district names and IDs
                district_names = [d['district_name'] for d in districts_in_window]
                district_ids = [d['district_id'] for d in districts_in_window]
                
                # Calculate total acres and machines required
                total_acres = sum(
                    sum(f['field_acres'] for f in self.farmers if f['district_id'] == d['district_id'])
                    for d in districts_in_window
                )
                machines_required = max(
                    self.MIN_MACHINES_PER_CLUSTER,
                    math.ceil(total_acres / (self.ACRES_PER_MACHINE_PER_DAY * self.CLUSTER_WINDOW_DAYS))
                )
                
                # Allocate available machines (greedy approach)
                available_machines = [m for m in self.machines if m.get('status') == 'available']
                machines_allocated = min(machines_required, len(available_machines))
                
                # Determine cluster status based on dates
                now = datetime.now()
                if window_end < now:
                    status = 'completed'
                elif current_date <= now < window_end:
                    status = 'active'
                else:
                    status = 'pending'
                
                cluster = HarvestCluster(
                    id=f"cluster_{cluster_num:02d}",
                    name=f"Cluster {cluster_letter} - {districts_in_window[0]['district_name']}",
                    region=', '.join(regions),
                    districts=district_names,
                    district_ids=district_ids,
                    window_start=current_date,
                    window_end=window_end - timedelta(days=1),
                    avg_ndvi=round(avg_ndvi, 4),
                    priority_score=round(avg_priority),
                    machines_required=machines_required,
                    machines_allocated=machines_allocated,
                    total_acres=total_acres,
                    status=status,
                    season=self.SEASON
                )
                
                self.clusters.append(cluster)
            
            current_date = window_end
        
        return self.clusters
    
    def assign_farmers_to_clusters(self) -> List[FarmerSchedule]:
        """
        Assign individual farmers to their respective clusters
        based on their field location and NDVI data.
        
        Returns:
            List of FarmerSchedule objects
        """
        self.schedules = []
        
        # Build district-to-cluster mapping
        district_cluster_map: Dict[str, HarvestCluster] = {}
        for cluster in self.clusters:
            for district_id in cluster.district_ids:
                district_cluster_map[district_id] = cluster
        
        # Assign each farmer
        for farmer in self.farmers:
            cluster = district_cluster_map.get(farmer['district_id'])
            
            if not cluster:
                # Farmer's district not in any cluster - skip or assign to nearest
                continue
            
            # Find prediction for this district
            prediction = self._district_prediction_map.get(farmer['district_id'])
            
            current_ndvi = prediction['current_ndvi'] if prediction else 0.5
            optimal_date = (
                datetime.strptime(prediction['predicted_harvest_date'], '%Y-%m-%d')
                if prediction and prediction.get('predicted_harvest_date')
                else cluster.window_start + timedelta(days=2)
            )
            
            # Determine priority level based on field size
            field_acres = farmer.get('field_acres', 5)
            if field_acres >= self.PREMIUM_ACRES_THRESHOLD:
                priority_level = 'premium'
            elif field_acres >= self.PRIORITY_ACRES_THRESHOLD:
                priority_level = 'priority'
            else:
                priority_level = 'normal'
            
            # Priority booking enabled for priority/premium farmers
            priority_booking = priority_level in ('priority', 'premium')
            
            schedule = FarmerSchedule(
                farmer_id=farmer['id'],
                farmer_name=farmer['name'],
                phone=farmer['phone'],
                district=farmer['district'],
                district_id=farmer['district_id'],
                field_id=farmer.get('field_id'),
                field_acres=field_acres,
                crop_type=farmer.get('crop_type', 'rice'),
                current_ndvi=current_ndvi,
                cluster_id=cluster.id,
                cluster_name=cluster.name,
                assigned_window_start=cluster.window_start,
                assigned_window_end=cluster.window_end,
                optimal_harvest_date=optimal_date,
                priority_level=priority_level,
                priority_booking_enabled=priority_booking,
                status='scheduled',
                season=self.SEASON
            )
            
            self.schedules.append(schedule)
            cluster.farmers.append(farmer)
        
        return self.schedules
    
    def generate_sms_messages(self, message_type: str = 'schedule_assigned') -> List[SMSMessage]:
        """
        Generate SMS messages for farmers about their assigned schedules.
        
        Args:
            message_type: Type of message to generate
            
        Returns:
            List of SMSMessage objects ready to be sent via Twilio
        """
        messages = []
        
        for schedule in self.schedules:
            # Find farmer's preferred language
            farmer = next((f for f in self.farmers if f['id'] == schedule.farmer_id), None)
            language = farmer.get('preferred_language', 'hindi') if farmer else 'hindi'
            
            if message_type == 'schedule_assigned':
                if language == 'hindi':
                    content = (
                        f"प्रिय {schedule.farmer_name}, "
                        f"आपकी फसल कटाई की तारीख "
                        f"{schedule.assigned_window_start.strftime('%d/%m')} से "
                        f"{schedule.assigned_window_end.strftime('%d/%m')} के बीच है। "
                        f"मशीन बुक करने के लिए AgriTrack ऐप पर जाएं। "
                        f"समय पर बुकिंग पर Green Credits मिलेंगे! "
                        f"- AgriTrack"
                    )
                else:
                    content = (
                        f"Dear {schedule.farmer_name}, "
                        f"your optimal harvest window is "
                        f"{schedule.assigned_window_start.strftime('%d %b')} to "
                        f"{schedule.assigned_window_end.strftime('%d %b')}. "
                        f"Book now on AgriTrack app for priority access. "
                        f"Earn Green Credits for on-time booking! "
                        f"- AgriTrack"
                    )
            
            elif message_type == 'reminder_3day':
                if language == 'hindi':
                    content = (
                        f"रिमाइंडर: {schedule.farmer_name}, "
                        f"आपकी हार्वेस्ट विंडो 3 दिन में शुरू होगी "
                        f"({schedule.assigned_window_start.strftime('%d/%m')})। "
                        f"अभी मशीन बुक करें! - AgriTrack"
                    )
                else:
                    content = (
                        f"Reminder: {schedule.farmer_name}, "
                        f"your harvest window starts in 3 days "
                        f"({schedule.assigned_window_start.strftime('%d %b')}). "
                        f"Book your machine now! - AgriTrack"
                    )
            
            elif message_type == 'booking_open':
                if language == 'hindi':
                    content = (
                        f"{schedule.farmer_name}, आपकी बुकिंग विंडो अब खुली है! "
                        f"AgriTrack ऐप पर जाएं और मशीन बुक करें। "
                        f"Priority: {schedule.priority_level.upper()} - AgriTrack"
                    )
                else:
                    content = (
                        f"{schedule.farmer_name}, your booking window is now OPEN! "
                        f"Visit AgriTrack app to book your machine. "
                        f"Priority: {schedule.priority_level.upper()} - AgriTrack"
                    )
            
            elif message_type == 'incentive_earned':
                if language == 'hindi':
                    content = (
                        f"बधाई हो {schedule.farmer_name}! "
                        f"आपने समय पर बुकिंग के लिए Green Credits कमाए। "
                        f"अपना बैलेंस देखने के लिए AgriTrack ऐप खोलें। - AgriTrack"
                    )
                else:
                    content = (
                        f"Congratulations {schedule.farmer_name}! "
                        f"You earned Green Credits for on-time booking. "
                        f"Open AgriTrack app to view your balance. - AgriTrack"
                    )
            
            else:
                continue
            
            messages.append(SMSMessage(
                farmer_id=schedule.farmer_id,
                schedule_id=schedule.cluster_id,
                phone=schedule.phone,
                message_type=message_type,
                message_content=content,
                language=language,
                priority=schedule.priority_level
            ))
        
        return messages
    
    def get_machine_availability_matrix(self) -> Dict:
        """
        Generate machine availability matrix for dashboard heatmap.
        Shows machines available per date per district.
        
        Returns:
            Dict with date -> district -> availability data
        """
        matrix = {}
        
        for cluster in self.clusters:
            current = cluster.window_start
            while current <= cluster.window_end:
                date_str = current.strftime('%Y-%m-%d')
                if date_str not in matrix:
                    matrix[date_str] = {}
                
                for district in cluster.districts:
                    farmers_in_district = [f for f in cluster.farmers if f.get('district') == district]
                    total_acres = sum(f.get('field_acres', 0) for f in farmers_in_district)
                    
                    if district not in matrix[date_str]:
                        # Calculate daily availability
                        machines_per_day = cluster.machines_allocated // self.CLUSTER_WINDOW_DAYS
                        capacity = machines_per_day * self.ACRES_PER_MACHINE_PER_DAY
                        
                        matrix[date_str][district] = {
                            'total_machines': machines_per_day or 1,
                            'available': machines_per_day or 1,
                            'booked': 0,
                            'capacity_acres': capacity,
                            'demand_acres': total_acres / self.CLUSTER_WINDOW_DAYS,
                            'demand_percentage': min(100, round((total_acres / self.CLUSTER_WINDOW_DAYS) / max(capacity, 1) * 100))
                        }
                
                current += timedelta(days=1)
        
        return matrix
    
    def get_gantt_chart_data(self) -> List[Dict]:
        """
        Generate data for Gantt chart visualization on dashboard.
        
        Returns:
            List of dicts with cluster timeline data
        """
        gantt_data = []
        
        for cluster in self.clusters:
            gantt_data.append({
                'id': cluster.id,
                'name': cluster.name,
                'region': cluster.region,
                'start': cluster.window_start.isoformat(),
                'end': cluster.window_end.isoformat(),
                'startDate': cluster.window_start.strftime('%Y-%m-%d'),
                'endDate': cluster.window_end.strftime('%Y-%m-%d'),
                'districts': cluster.districts,
                'machines_allocated': cluster.machines_allocated,
                'machines_required': cluster.machines_required,
                'machine_coverage': round(cluster.machines_allocated / max(cluster.machines_required, 1) * 100),
                'farmers_count': len(cluster.farmers),
                'total_acres': cluster.total_acres,
                'avg_ndvi': cluster.avg_ndvi,
                'priority': cluster.priority_score,
                'status': cluster.status,
                'color': self._get_priority_color(cluster.priority_score),
                'season': cluster.season
            })
        
        return gantt_data
    
    def _get_priority_color(self, priority: int) -> str:
        """Get color based on priority score."""
        if priority >= 8:
            return '#ef4444'  # red - urgent
        elif priority >= 6:
            return '#f97316'  # orange - high
        elif priority >= 4:
            return '#eab308'  # yellow - medium
        else:
            return '#22c55e'  # green - low
    
    def get_summary(self) -> Dict:
        """Generate scheduling summary statistics."""
        total_farmers = len(self.schedules)
        total_clusters = len(self.clusters)
        total_machines_allocated = sum(c.machines_allocated for c in self.clusters)
        total_machines_required = sum(c.machines_required for c in self.clusters)
        total_acres = sum(c.total_acres for c in self.clusters)
        
        # Count by priority level
        priority_counts = {'normal': 0, 'priority': 0, 'premium': 0}
        for s in self.schedules:
            priority_counts[s.priority_level] = priority_counts.get(s.priority_level, 0) + 1
        
        return {
            'total_farmers': total_farmers,
            'total_clusters': total_clusters,
            'total_acres': round(total_acres, 2),
            'total_machines_allocated': total_machines_allocated,
            'total_machines_required': total_machines_required,
            'machine_deficit': max(0, total_machines_required - total_machines_allocated),
            'allocation_rate': round(
                total_machines_allocated / max(total_machines_required, 1) * 100, 1
            ),
            'avg_farmers_per_cluster': round(total_farmers / max(total_clusters, 1), 1),
            'avg_acres_per_farmer': round(total_acres / max(total_farmers, 1), 1),
            'date_range': {
                'start': min(c.window_start for c in self.clusters).isoformat() if self.clusters else None,
                'end': max(c.window_end for c in self.clusters).isoformat() if self.clusters else None
            },
            'priority_distribution': {
                'high': len([c for c in self.clusters if c.priority_score >= 8]),
                'medium': len([c for c in self.clusters if 5 <= c.priority_score < 8]),
                'low': len([c for c in self.clusters if c.priority_score < 5])
            },
            'farmer_priority_distribution': priority_counts,
            'season': self.SEASON
        }
    
    def get_district_schedule(self, district_id: str) -> Dict:
        """Get scheduling details for a specific district."""
        # Find cluster containing this district
        cluster = next(
            (c for c in self.clusters if district_id in c.district_ids),
            None
        )
        
        if not cluster:
            return {'error': 'District not found in any cluster'}
        
        # Get farmers in this district
        farmers_in_district = [
            s for s in self.schedules 
            if s.district_id == district_id
        ]
        
        return {
            'district_id': district_id,
            'cluster_id': cluster.id,
            'cluster_name': cluster.name,
            'window_start': cluster.window_start.isoformat(),
            'window_end': cluster.window_end.isoformat(),
            'farmers_count': len(farmers_in_district),
            'total_acres': sum(f.field_acres for f in farmers_in_district),
            'farmers': [asdict(f) for f in farmers_in_district]
        }
    
    def to_dict(self) -> Dict:
        """Export all scheduling data as dictionary."""
        return {
            'generated_at': datetime.now().isoformat(),
            'season': self.SEASON,
            'summary': self.get_summary(),
            'clusters': [
                {
                    **asdict(c),
                    'window_start': c.window_start.isoformat(),
                    'window_end': c.window_end.isoformat(),
                    'farmers': []  # Don't include full farmer list
                }
                for c in self.clusters
            ],
            'gantt_data': self.get_gantt_chart_data(),
        }
    
    def to_json(self) -> str:
        """Export all scheduling data as JSON."""
        return json.dumps(self.to_dict(), default=str, indent=2)


def run_scheduler_demo():
    """Run the scheduler with mock data for demonstration."""
    print("=" * 70)
    print("DYNAMIC HARVEST SCHEDULER - Demo Run")
    print("=" * 70)
    
    # Generate NDVI predictions
    print("\n📡 Generating NDVI data...")
    ndvi_data = generate_district_ndvi_data(30)
    predictor = HarvestPredictor(ndvi_data)
    predictions = predictor.predict_all_districts()
    
    # Get machines
    machines = get_machines_data()
    
    print(f"   Input: {len(predictions)} districts, {len(machines)} machines")
    
    # Initialize scheduler
    scheduler = HarvestScheduler(predictions, machines)
    
    # Create clusters
    print("\n🔄 Creating harvest clusters...")
    clusters = scheduler.create_clusters()
    print(f"   Created {len(clusters)} clusters")
    
    print("\n" + "-" * 70)
    print(f"{'Cluster':<28} {'Window':<18} {'Districts':<8} {'Machines':<12} {'Priority'}")
    print("-" * 70)
    
    for c in clusters:
        print(f"{c.name:<28} {c.window_start.strftime('%b %d')}-{c.window_end.strftime('%b %d'):<8} "
              f"{len(c.districts):<8} {c.machines_allocated}/{c.machines_required:<8} {c.priority_score}/10")
    
    # Assign farmers
    print("\n👨‍🌾 Assigning farmers to clusters...")
    schedules = scheduler.assign_farmers_to_clusters()
    print(f"   Assigned {len(schedules)} farmers")
    
    # Generate SMS messages
    print("\n📱 Generating SMS advisory messages...")
    messages = scheduler.generate_sms_messages('schedule_assigned')
    print(f"   Generated {len(messages)} messages")
    
    # Print sample message
    if messages:
        print("\n   Sample SMS (Hindi):")
        hindi_msg = next((m for m in messages if m.language == 'hindi'), messages[0])
        print(f"   \"{hindi_msg.message_content[:100]}...\"")
    
    # Print summary
    summary = scheduler.get_summary()
    print("\n" + "=" * 70)
    print("📊 SCHEDULING SUMMARY")
    print("=" * 70)
    print(f"   Season: {summary['season']}")
    print(f"   Total Farmers: {summary['total_farmers']}")
    print(f"   Total Clusters: {summary['total_clusters']}")
    print(f"   Total Acres: {summary['total_acres']:,.0f}")
    print(f"   Machines Allocated: {summary['total_machines_allocated']}")
    print(f"   Machines Required: {summary['total_machines_required']}")
    print(f"   Machine Deficit: {summary['machine_deficit']}")
    print(f"   Allocation Rate: {summary['allocation_rate']}%")
    print(f"   Date Range: {summary['date_range']['start'][:10]} to {summary['date_range']['end'][:10]}")
    
    print("\n   Priority Distribution (Clusters):")
    print(f"     🔴 High (8-10): {summary['priority_distribution']['high']}")
    print(f"     🟠 Medium (5-7): {summary['priority_distribution']['medium']}")
    print(f"     🟢 Low (1-4): {summary['priority_distribution']['low']}")
    
    print("\n   Farmer Priority Levels:")
    print(f"     Normal: {summary['farmer_priority_distribution']['normal']}")
    print(f"     Priority: {summary['farmer_priority_distribution']['priority']}")
    print(f"     Premium: {summary['farmer_priority_distribution']['premium']}")
    
    return scheduler


if __name__ == "__main__":
    import sys
    
    scheduler = run_scheduler_demo()
    
    # Export to JSON if requested
    if len(sys.argv) > 1 and sys.argv[1] == '--json':
        print("\n" + "=" * 70)
        print("JSON OUTPUT")
        print("=" * 70)
        print(scheduler.to_json())
    
    # Export to file if requested
    if len(sys.argv) > 1 and sys.argv[1] == '--export':
        filename = 'scheduler_output.json'
        with open(filename, 'w') as f:
            f.write(scheduler.to_json())
        print(f"\n✅ Exported to {filename}")
