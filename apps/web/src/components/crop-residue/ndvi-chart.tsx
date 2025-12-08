'use client';

import { useEffect, useRef } from 'react';
import { NDVIHistory } from '@/lib/crop-api';

interface NDVIChartProps {
  history: NDVIHistory | null;
  loading: boolean;
}

/**
 * Dynamic NDVI trend chart using Canvas
 * Shows NDVI values over time with threshold line
 */
export function NDVIChart({ history, loading }: NDVIChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!history || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas with theme-aware background
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1c1c1c' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const data = history.history;
    if (data.length === 0) return;

    // Calculate scales
    const minNDVI = 0;
    const maxNDVI = 1;
    const xScale = chartWidth / (data.length - 1);
    const yScale = chartHeight / (maxNDVI - minNDVI);

    // Draw grid
    ctx.strokeStyle = isDark ? '#333333' : '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (i / 10) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw harvest threshold line (NDVI = 0.4)
    const thresholdY = padding.top + (1 - 0.4) * chartHeight;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, thresholdY);
    ctx.lineTo(width - padding.right, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw threshold label
    ctx.fillStyle = '#ef4444';
    ctx.font = '10px sans-serif';
    ctx.fillText('Harvest Threshold (0.4)', padding.left + 5, thresholdY - 5);

    // Draw NDVI line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + (1 - point.ndvi) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw data points
    data.forEach((point, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + (1 - point.ndvi) * chartHeight;
      
      // Point color based on NDVI value
      if (point.ndvi < 0.4) {
        ctx.fillStyle = '#ef4444'; // Red
      } else if (point.ndvi < 0.6) {
        ctx.fillStyle = '#f59e0b'; // Yellow
      } else {
        ctx.fillStyle = '#10b981'; // Green
      }
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Y-axis labels
    ctx.fillStyle = isDark ? '#a1a1aa' : '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const value = 1 - i / 10;
      const y = padding.top + (i / 10) * chartHeight + 4;
      ctx.fillText(value.toFixed(1), padding.left - 8, y);
    }

    // Draw X-axis labels (show first, middle, last dates)
    ctx.textAlign = 'center';
    const indices = [0, Math.floor(data.length / 2), data.length - 1];
    indices.forEach((i) => {
      const x = padding.left + i * xScale;
      const date = new Date(data[i].date);
      ctx.fillText(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), x, height - 10);
    });

    // Draw axis labels
    ctx.fillStyle = isDark ? '#e4e4e7' : '#374151';
    ctx.font = 'bold 12px sans-serif';
    
    // Y-axis label
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('NDVI Value', 0, 0);
    ctx.restore();

  }, [history]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow border p-4 h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="bg-card rounded-lg shadow border p-4 h-64 flex items-center justify-center text-muted-foreground">
        Select a district to view NDVI history
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50">
        <h3 className="text-lg font-semibold text-foreground">
          📈 NDVI Trend: {history.district_name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {history.state} • Last {history.num_days} days
        </p>
      </div>
      <div className="p-4">
        <canvas 
          ref={canvasRef} 
          className="w-full h-64"
          style={{ width: '100%', height: '256px' }}
        />
      </div>
      <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground flex justify-between">
        <span>🟢 Healthy (&gt;0.6)</span>
        <span>🟡 Stressed (0.4-0.6)</span>
        <span>🔴 Harvest Ready (&lt;0.4)</span>
      </div>
    </div>
  );
}
