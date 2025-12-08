'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DashboardData,
  NDVIHistory,
  fetchDashboardData,
  fetchNDVIHistory,
} from '@/lib/crop-api';

/**
 * Hook for fetching and managing dashboard data
 * Auto-refreshes every 30 seconds
 */
export function useDashboardData(refreshInterval = 30000) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchDashboardData();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    
    // Auto-refresh
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  return { data, loading, error, lastUpdated, refresh };
}

/**
 * Hook for fetching NDVI history for a specific district
 */
export function useNDVIHistory(districtId: string | null) {
  const [history, setHistory] = useState<NDVIHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!districtId) {
      setHistory(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const result = await fetchNDVIHistory(districtId);
        setHistory(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch NDVI history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [districtId]);

  return { history, loading, error };
}
