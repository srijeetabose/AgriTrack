'use client';

import { useState } from 'react';
import { Prediction } from '@/lib/crop-api';

interface PriorityTableProps {
  predictions: Prediction[];
  onSelectDistrict: (districtId: string) => void;
  selectedDistrict: string | null;
}

/**
 * Priority-sorted table of harvest predictions
 * Click on a district to view its NDVI history
 */
export function PriorityTable({ predictions, onSelectDistrict, selectedDistrict }: PriorityTableProps) {
  const [sortBy, setSortBy] = useState<'priority' | 'ndvi' | 'days'>('priority');

  const sorted = [...predictions].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return b.priority_score - a.priority_score;
      case 'ndvi':
        return a.current_ndvi - b.current_ndvi;
      case 'days':
        return a.days_until_harvest - b.days_until_harvest;
      default:
        return 0;
    }
  });

  const getPriorityBadge = (level: string, score: number) => {
    const colors: Record<string, string> = {
      'CRITICAL': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'HIGH': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'LOW': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
        {level} ({score.toFixed(1)})
      </span>
    );
  };

  const getNDVIColor = (ndvi: number) => {
    if (ndvi < 0.4) return 'text-red-600 dark:text-red-400 font-bold';
    if (ndvi < 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="bg-card rounded-lg shadow border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">🎯 Harvest Predictions</h3>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setSortBy('priority')}
            className={`px-3 py-1 rounded ${sortBy === 'priority' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Priority
          </button>
          <button
            onClick={() => setSortBy('ndvi')}
            className={`px-3 py-1 rounded ${sortBy === 'ndvi' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            NDVI
          </button>
          <button
            onClick={() => setSortBy('days')}
            className={`px-3 py-1 rounded ${sortBy === 'days' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Days
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 text-left">District</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-center">NDVI</th>
              <th className="px-4 py-3 text-center">Decline/Day</th>
              <th className="px-4 py-3 text-center">Days to Harvest</th>
              <th className="px-4 py-3 text-center">Predicted Date</th>
              <th className="px-4 py-3 text-center">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((pred) => (
              <tr
                key={pred.district_id}
                onClick={() => onSelectDistrict(pred.district_id)}
                className={`cursor-pointer transition-colors ${
                  selectedDistrict === pred.district_id
                    ? 'bg-primary/10'
                    : 'hover:bg-muted/50'
                }`}
              >
                <td className="px-4 py-3 font-medium text-foreground">{pred.district_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{pred.state}</td>
                <td className={`px-4 py-3 text-center ${getNDVIColor(pred.current_ndvi)}`}>
                  {pred.current_ndvi.toFixed(3)}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {(pred.ndvi_decline_rate * 100).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={pred.days_until_harvest <= 5 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-foreground'}>
                    {pred.days_until_harvest}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {new Date(pred.predicted_harvest_date).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3 text-center">
                  {getPriorityBadge(pred.status, pred.priority_score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
