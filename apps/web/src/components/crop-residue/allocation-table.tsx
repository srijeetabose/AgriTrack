'use client';

import { Allocation } from '@/lib/crop-api';

interface AllocationTableProps {
  allocations: Allocation[];
}

/**
 * Machine allocation results table
 * Shows optimized machine assignments
 */
export function AllocationTable({ allocations }: AllocationTableProps) {
  const getMachineIcon = (type: string) => {
    switch (type) {
      case 'Combine Harvester':
        return '🚜';
      case 'Baler':
        return '🌾';
      case 'Happy Seeder':
        return '🌱';
      default:
        return '⚙️';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50">
        <h3 className="text-lg font-semibold text-foreground">🚜 Machine Allocations</h3>
        <p className="text-sm text-muted-foreground">Optimized using greedy algorithm with distance minimization</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Machine</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-center">Capacity (acres/day)</th>
              <th className="px-4 py-3 text-left">Assigned District</th>
              <th className="px-4 py-3 text-center">Distance (km)</th>
              <th className="px-4 py-3 text-center">ETA (hrs)</th>
              <th className="px-4 py-3 text-center">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allocations.map((alloc) => (
              <tr key={alloc.machine_id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">
                  {getMachineIcon(alloc.machine_type)} {alloc.machine_id}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{alloc.machine_type}</td>
                <td className="px-4 py-3 text-center text-foreground">{alloc.machine_capacity_acres_per_day}</td>
                <td className="px-4 py-3 text-foreground">{alloc.district_name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={alloc.distance_km > 100 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
                    {alloc.distance_km.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-foreground">{alloc.eta_hours.toFixed(1)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alloc.priority_score >= 7 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                      : alloc.priority_score >= 5 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {alloc.priority_score.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allocations.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No allocations available
        </div>
      )}
    </div>
  );
}
