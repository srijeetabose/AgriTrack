"""
Crop Residue Management System - Main Entry Point
==================================================
A predictive system for managing crop residue (stubble) in Punjab, Haryana, and Delhi-NCR.

This system helps prevent stubble burning by:
1. Predicting harvest dates using NDVI satellite data analysis
2. Optimally allocating stubble management machines to districts

Problem Context:
---------------
Every year after the Kharif (monsoon) rice harvest (Oct-Nov), farmers in Punjab and 
Haryana burn crop residue, causing severe air pollution in Delhi-NCR. This system
helps deploy machines (Happy Seeders, Balers, Super SMS) proactively based on 
satellite-predicted harvest readiness.

Usage:
------
    python main.py                    # Run full demo
    python main.py --json             # Output as JSON only
    python main.py --urgent           # Show only urgent districts

Author: AgriTrack Team
Problem: SIH 2025 - Smart CRM Machinery Monitoring
"""

import sys
import json
from datetime import datetime

from mock_data import generate_district_ndvi_data, get_machines_data, DISTRICTS
from harvest_predictor import HarvestPredictor
from machine_allocator import MachineAllocator


def print_banner():
    """Print the system banner."""
    banner = """
    ╔══════════════════════════════════════════════════════════════════════╗
    ║                                                                      ║
    ║     🌾 CROP RESIDUE MANAGEMENT SYSTEM 🌾                             ║
    ║     ─────────────────────────────────────                            ║
    ║     Satellite-based Harvest Prediction & Machine Allocation          ║
    ║     For Punjab, Haryana, Delhi-NCR Region                            ║
    ║                                                                      ║
    ║     Powered by NDVI Analysis | AgriTrack                             ║
    ║                                                                      ║
    ╚══════════════════════════════════════════════════════════════════════╝
    """
    print(banner)


def run_prediction_system(output_json: bool = False, urgent_only: bool = False) -> dict:
    """
    Run the complete crop residue management prediction and allocation system.
    
    Args:
        output_json: If True, output results as JSON only
        urgent_only: If True, show only urgent districts (priority >= 7)
        
    Returns:
        Dictionary containing predictions, allocations, and summary
    """
    
    if not output_json:
        print_banner()
        print(f"  📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  📍 Coverage: {len(DISTRICTS)} districts across Punjab, Haryana, Chandigarh, Delhi")
        print()
    
    # ═══════════════════════════════════════════════════════════════════════
    # TASK 1: Generate NDVI Data and Predict Harvest Dates
    # ═══════════════════════════════════════════════════════════════════════
    
    if not output_json:
        print("  ┌─────────────────────────────────────────────────────────────────┐")
        print("  │ TASK 1: SATELLITE PREDICTION MODULE                            │")
        print("  │ Analyzing NDVI trends to predict harvest readiness...          │")
        print("  └─────────────────────────────────────────────────────────────────┘")
        print()
    
    # Generate mock NDVI time-series data (30 days)
    ndvi_data = generate_district_ndvi_data(num_days=30)
    
    # Initialize predictor and get predictions
    predictor = HarvestPredictor(ndvi_data)
    predictions = predictor.predict_all_districts()
    
    if urgent_only:
        predictions = [p for p in predictions if p['priority_score'] >= 7]
    
    if not output_json:
        print("  📡 NDVI Analysis Results:")
        print("  " + "─" * 65)
        print(f"  {'District':<14} {'State':<10} {'NDVI':<7} {'Rate/Day':<9} {'Harvest':<12} {'Priority'}")
        print("  " + "─" * 65)
        
        for p in predictions:
            priority_indicator = "🔴" if p['priority_score'] >= 8 else "🟡" if p['priority_score'] >= 5 else "🟢"
            harvest_date = p['predicted_harvest_date'] or 'N/A'
            print(f"  {p['district_name']:<14} {p['state']:<10} {p['current_ndvi']:<7.3f} "
                  f"{p['ndvi_decline_rate']:<9.4f} {harvest_date:<12} {priority_indicator} {p['priority_score']}/10")
        
        print()
    
    # ═══════════════════════════════════════════════════════════════════════
    # TASK 2: Machine Allocation
    # ═══════════════════════════════════════════════════════════════════════
    
    if not output_json:
        print("  ┌─────────────────────────────────────────────────────────────────┐")
        print("  │ TASK 2: RESOURCE OPTIMIZATION MODULE                           │")
        print("  │ Allocating machines using greedy algorithm...                  │")
        print("  └─────────────────────────────────────────────────────────────────┘")
        print()
    
    # Get available machines
    machines = get_machines_data()
    
    # Run allocation
    allocator = MachineAllocator(machines, predictions)
    allocations = allocator.allocate_machines()
    summary = allocator.get_allocation_summary()
    
    if not output_json:
        print("  🚜 Machine Allocation Results:")
        print("  " + "─" * 65)
        print(f"  {'District':<14} {'Machine':<9} {'Type':<14} {'Dist(km)':<10} {'ETA(hrs)':<10}")
        print("  " + "─" * 65)
        
        for a in allocations:
            print(f"  {a['district_name']:<14} {a['machine_id']:<9} {a['machine_type']:<14} "
                  f"{a['distance_km']:<10.1f} {a['eta_hours']:<10.1f}")
        
        if allocator.unallocated_districts:
            print()
            print("  ⚠️  Unallocated Districts (insufficient machines):")
            for u in allocator.unallocated_districts:
                print(f"      - {u['district_name']} (Priority: {u['priority_score']}/10)")
        
        print()
    
    # ═══════════════════════════════════════════════════════════════════════
    # Summary and Output
    # ═══════════════════════════════════════════════════════════════════════
    
    result = {
        "metadata": {
            "analysis_date": datetime.now().isoformat(),
            "system": "Crop Residue Management System",
            "version": "1.0.0",
            "region": "Punjab, Haryana, Chandigarh, Delhi-NCR"
        },
        "predictions": predictions,
        "allocations": allocations,
        "unallocated_districts": allocator.unallocated_districts,
        "summary": summary
    }
    
    if output_json:
        print(json.dumps(result, indent=2))
    else:
        print("  ┌─────────────────────────────────────────────────────────────────┐")
        print("  │ 📊 ALLOCATION SUMMARY                                          │")
        print("  └─────────────────────────────────────────────────────────────────┘")
        print()
        print(f"    ✅ Districts Covered:     {summary['districts_allocated']}/{summary['total_districts']} ({summary['allocation_rate']})")
        print(f"    📏 Total Travel Distance: {summary['total_travel_distance_km']} km")
        print(f"    ⏱️  Average ETA:           {summary['average_eta_hours']} hours")
        print(f"    🚜 Machines Deployed:     {summary['districts_allocated']}")
        print(f"    🔧 Machines Remaining:    {summary['machines_remaining']}")
        print()
        print("    Machine Types Used:")
        for machine_type, count in summary['machines_used_by_type'].items():
            print(f"      • {machine_type}: {count}")
        print()
        
        # Urgent alerts
        urgent = [p for p in predictions if p['priority_score'] >= 8]
        if urgent:
            print("  ┌─────────────────────────────────────────────────────────────────┐")
            print("  │ 🚨 URGENT ALERTS                                               │")
            print("  └─────────────────────────────────────────────────────────────────┘")
            print()
            for u in urgent:
                days = u['days_until_harvest'] if u['days_until_harvest'] else 0
                print(f"    🔴 {u['district_name']} ({u['state']})")
                print(f"       NDVI: {u['current_ndvi']:.3f} | Harvest in {days} days | Priority: {u['priority_score']}/10")
                print()
        
        print("  " + "═" * 65)
        print("  ✅ Analysis complete. Data exported to JSON format.")
        print()
    
    return result


def main():
    """Main entry point with command-line argument handling."""
    output_json = "--json" in sys.argv
    urgent_only = "--urgent" in sys.argv
    
    result = run_prediction_system(output_json=output_json, urgent_only=urgent_only)
    
    # Save JSON output to file
    if not output_json:
        output_file = "output.json"
        with open(output_file, "w") as f:
            json.dump(result, indent=2, fp=f)
        print(f"  📁 Results saved to: {output_file}")
        print()


if __name__ == "__main__":
    main()
