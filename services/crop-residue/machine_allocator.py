"""
Machine Allocator Module - Task 2
=================================
Optimally allocates stubble management machines to districts based on priority and distance.

Greedy Algorithm Approach:
--------------------------
1. Sort districts by priority_score (highest first - most urgent)
2. For each district:
   a. Find all available machines
   b. Calculate distance from each machine to district
   c. Select the nearest available machine
   d. Mark machine as allocated
3. Continue until all districts are assigned or machines exhausted

Machine Types for Crop Residue Management:
------------------------------------------
1. Happy Seeder: Sows wheat while cutting stubble (no burning needed)
2. Super SMS (Straw Management System): Shreds straw and spreads evenly
3. Baler: Compresses straw into bales for transport/sale
4. Rotavator: Mixes stubble into soil

Distance Calculation:
--------------------
Using Haversine formula for accurate distance between lat/lon coordinates.
"""

import math
from typing import List, Dict, Optional, Tuple
import json


class MachineAllocator:
    """
    Allocates stubble management machines to districts using a greedy algorithm
    that prioritizes urgent districts and minimizes travel distance.
    """
    
    # Average speed for machine transport (km/h)
    TRANSPORT_SPEED_KMH = 30
    
    def __init__(self, machines: List[Dict], predictions: List[Dict]):
        """
        Initialize the allocator with available machines and harvest predictions.
        
        Args:
            machines: List of machine dicts with keys [id, type, lat, lon, available, capacity_acres_per_day]
            predictions: List of prediction dicts from HarvestPredictor
        """
        # Deep copy to avoid modifying original data
        self.machines = [m.copy() for m in machines]
        self.predictions = sorted(predictions, key=lambda x: x['priority_score'], reverse=True)
        self.allocations = []
        self.unallocated_districts = []
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two points on Earth.
        
        The Haversine formula determines the shortest distance over the earth's
        surface, giving an "as-the-crow-flies" distance between the points.
        
        Args:
            lat1, lon1: Latitude and longitude of point 1 (in degrees)
            lat2, lon2: Latitude and longitude of point 2 (in degrees)
            
        Returns:
            Distance in kilometers
        """
        # Earth's radius in kilometers
        R = 6371.0
        
        # Convert degrees to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = math.sin(delta_lat / 2) ** 2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return round(distance, 2)
    
    def find_nearest_available_machine(
        self,
        district_lat: float,
        district_lon: float,
        preferred_type: Optional[str] = None
    ) -> Optional[Tuple[Dict, float]]:
        """
        Find the nearest available machine to a district.
        
        Args:
            district_lat: District latitude
            district_lon: District longitude
            preferred_type: Optional machine type preference
            
        Returns:
            Tuple of (machine_dict, distance_km) or None if no machines available
        """
        available_machines = [m for m in self.machines if m.get('available', True)]
        
        if preferred_type:
            # Try to find preferred type first
            typed_machines = [m for m in available_machines if m['type'] == preferred_type]
            if typed_machines:
                available_machines = typed_machines
        
        if not available_machines:
            return None
        
        # Calculate distance to each available machine
        machine_distances = []
        for machine in available_machines:
            distance = self.haversine_distance(
                district_lat, district_lon,
                machine['lat'], machine['lon']
            )
            machine_distances.append((machine, distance))
        
        # Sort by distance and return nearest
        machine_distances.sort(key=lambda x: x[1])
        return machine_distances[0]
    
    def allocate_machines(self) -> List[Dict]:
        """
        Run the greedy allocation algorithm.
        
        Algorithm:
        1. Process districts in order of priority (highest first)
        2. For each district, find and allocate the nearest available machine
        3. Track allocations and unallocated districts
        
        Returns:
            List of allocation dictionaries
        """
        self.allocations = []
        self.unallocated_districts = []
        
        for prediction in self.predictions:
            district_id = prediction['district_id']
            district_name = prediction['district_name']
            district_lat = prediction['lat']
            district_lon = prediction['lon']
            priority = prediction['priority_score']
            
            # Find nearest available machine
            result = self.find_nearest_available_machine(district_lat, district_lon)
            
            if result is None:
                # No machines available
                self.unallocated_districts.append({
                    "district_id": district_id,
                    "district_name": district_name,
                    "priority_score": priority,
                    "reason": "No available machines"
                })
                continue
            
            machine, distance = result
            
            # Calculate ETA (Estimated Time of Arrival)
            eta_hours = round(distance / self.TRANSPORT_SPEED_KMH, 1)
            
            # Create allocation record
            allocation = {
                "district_id": district_id,
                "district_name": district_name,
                "state": prediction['state'],
                "priority_score": priority,
                "machine_id": machine['id'],
                "machine_type": machine['type'],
                "machine_capacity_acres_per_day": machine.get('capacity_acres_per_day', 10),
                "machine_origin": {
                    "lat": machine['lat'],
                    "lon": machine['lon']
                },
                "district_location": {
                    "lat": district_lat,
                    "lon": district_lon
                },
                "distance_km": distance,
                "eta_hours": eta_hours,
                "predicted_harvest_date": prediction['predicted_harvest_date'],
                "days_until_harvest": prediction['days_until_harvest']
            }
            
            self.allocations.append(allocation)
            
            # Mark machine as unavailable
            for m in self.machines:
                if m['id'] == machine['id']:
                    m['available'] = False
                    break
        
        return self.allocations
    
    def get_allocation_summary(self) -> Dict:
        """
        Generate a summary of the allocation results.
        
        Returns:
            Dictionary with allocation statistics
        """
        if not self.allocations and not self.unallocated_districts:
            self.allocate_machines()
        
        total_districts = len(self.predictions)
        allocated = len(self.allocations)
        unallocated = len(self.unallocated_districts)
        
        # Calculate statistics
        if self.allocations:
            avg_distance = sum(a['distance_km'] for a in self.allocations) / allocated
            avg_eta = sum(a['eta_hours'] for a in self.allocations) / allocated
            total_distance = sum(a['distance_km'] for a in self.allocations)
            
            # Machine type breakdown
            machine_types = {}
            for a in self.allocations:
                mt = a['machine_type']
                machine_types[mt] = machine_types.get(mt, 0) + 1
        else:
            avg_distance = avg_eta = total_distance = 0
            machine_types = {}
        
        return {
            "total_districts": total_districts,
            "districts_allocated": allocated,
            "districts_unallocated": unallocated,
            "allocation_rate": f"{(allocated/total_districts)*100:.1f}%" if total_districts > 0 else "0%",
            "total_travel_distance_km": round(total_distance, 2),
            "average_distance_km": round(avg_distance, 2),
            "average_eta_hours": round(avg_eta, 1),
            "machines_used_by_type": machine_types,
            "machines_remaining": len([m for m in self.machines if m.get('available', True)])
        }
    
    def get_allocations_by_priority(self, min_priority: int = 1) -> List[Dict]:
        """
        Get allocations filtered by minimum priority score.
        
        Args:
            min_priority: Minimum priority score to include
            
        Returns:
            Filtered list of allocations
        """
        return [a for a in self.allocations if a['priority_score'] >= min_priority]
    
    def to_json(self) -> str:
        """Export allocation results as JSON string."""
        if not self.allocations:
            self.allocate_machines()
        
        return json.dumps({
            "allocations": self.allocations,
            "unallocated_districts": self.unallocated_districts,
            "summary": self.get_allocation_summary()
        }, indent=2)


if __name__ == "__main__":
    # Demo: Test the allocator with mock data
    from mock_data import generate_district_ndvi_data, get_machines_data
    from harvest_predictor import HarvestPredictor
    
    print("=" * 70)
    print("MACHINE ALLOCATOR - Demo Run")
    print("=" * 70)
    
    # Generate predictions
    ndvi_df = generate_district_ndvi_data(30)
    predictor = HarvestPredictor(ndvi_df)
    predictions = predictor.predict_all_districts()
    
    # Get available machines
    machines = get_machines_data()
    
    print(f"\nInput: {len(predictions)} districts, {len(machines)} machines")
    
    # Run allocation
    allocator = MachineAllocator(machines, predictions)
    allocations = allocator.allocate_machines()
    
    print("\n" + "-" * 70)
    print("ALLOCATION RESULTS:")
    print("-" * 70)
    print(f"{'District':<15} {'Machine':<10} {'Type':<14} {'Distance':<12} {'ETA':<10} {'Priority'}")
    print("-" * 70)
    
    for a in allocations:
        print(f"{a['district_name']:<15} {a['machine_id']:<10} {a['machine_type']:<14} "
              f"{a['distance_km']:<12.1f} {a['eta_hours']:<10.1f} {a['priority_score']}/10")
    
    # Print summary
    summary = allocator.get_allocation_summary()
    print("\n" + "=" * 70)
    print("ALLOCATION SUMMARY:")
    print("=" * 70)
    print(f"  Districts allocated: {summary['districts_allocated']}/{summary['total_districts']} ({summary['allocation_rate']})")
    print(f"  Total travel distance: {summary['total_travel_distance_km']} km")
    print(f"  Average distance: {summary['average_distance_km']} km")
    print(f"  Average ETA: {summary['average_eta_hours']} hours")
    print(f"  Machines remaining: {summary['machines_remaining']}")
    print(f"  Machines by type: {summary['machines_used_by_type']}")
