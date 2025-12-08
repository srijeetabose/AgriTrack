'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useDashboardData, useNDVIHistory } from '@/hooks/use-crop-data';
import { StatisticsCards } from '@/components/crop-residue/statistics-cards';
import { PriorityTable } from '@/components/crop-residue/priority-table';
import { AllocationTable } from '@/components/crop-residue/allocation-table';
import { NDVIChart } from '@/components/crop-residue/ndvi-chart';

/**
 * Crop Residue Management Dashboard
 * Dynamic data from Python FastAPI backend
 */
export default function CropResiduePage() {
  const { data, loading, error, lastUpdated, refresh } = useDashboardData();
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const { history: ndviHistory, loading: ndviLoading } = useNDVIHistory(selectedDistrict);

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
            <p className="mt-2 text-sm">
              Make sure the FastAPI server is running on port 8001:
              <code className="block mt-1 bg-muted p-2 rounded text-xs">
                cd services/crop-residue && python -m uvicorn server:app --host 0.0.0.0 --port 8001
              </code>
            </p>
            <button
              onClick={refresh}
              className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading crop residue data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">🌾 Crop Residue Management</h1>
              <p className="text-muted-foreground mt-1">
                NDVI-based harvest prediction & machine allocation
              </p>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                '🔄'
              )}
              Refresh Data
            </button>
          </div>

          {/* Statistics Cards */}
          {data && (
            <StatisticsCards statistics={data.statistics} lastUpdated={lastUpdated} />
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Predictions Table - 2/3 width */}
            <div className="lg:col-span-2">
              {data && (
                <PriorityTable
                  predictions={data.predictions}
                  onSelectDistrict={setSelectedDistrict}
                  selectedDistrict={selectedDistrict}
                />
              )}
            </div>

            {/* NDVI Chart - 1/3 width */}
            <div>
              <NDVIChart history={ndviHistory} loading={ndviLoading} />
            </div>
          </div>

          {/* Machine Allocations */}
          {data && <AllocationTable allocations={data.allocations} />}

          {/* Footer Info */}
          <div className="text-sm text-muted-foreground text-center py-4 border-t">
            <p>
              Data generated dynamically using NDVI satellite simulation • 
              Allocation optimized with greedy algorithm • 
              <span className="font-mono ml-2">
                Generated: {data?.metadata?.generated_at ? new Date(data.metadata.generated_at).toLocaleString() : 'N/A'}
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
