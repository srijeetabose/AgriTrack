'use client';

interface StatisticsCardsProps {
  statistics: {
    total_districts: number;
    urgent_districts: number;
    harvest_ready: number;
    average_ndvi: number;
    total_machines: number;
    machines_allocated: number;
    allocation_rate: string;
    total_travel_km: number;
  };
  lastUpdated: Date | null;
}

/**
 * Dynamic statistics cards for the dashboard
 */
export function StatisticsCards({ statistics, lastUpdated }: StatisticsCardsProps) {
  const cards = [
    {
      title: 'Total Districts',
      value: statistics.total_districts,
      icon: '📍',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-700 dark:text-blue-400',
    },
    {
      title: 'Urgent (Priority 7+)',
      value: statistics.urgent_districts,
      icon: '🔴',
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-700 dark:text-red-400',
    },
    {
      title: 'Harvest Ready',
      value: statistics.harvest_ready,
      icon: '🌾',
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-700 dark:text-amber-400',
    },
    {
      title: 'Average NDVI',
      value: statistics.average_ndvi.toFixed(3),
      icon: '📡',
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      textColor: 'text-green-700 dark:text-green-400',
    },
    {
      title: 'Machines Deployed',
      value: `${statistics.machines_allocated}/${statistics.total_machines}`,
      icon: '🚜',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      textColor: 'text-purple-700 dark:text-purple-400',
    },
    {
      title: 'Allocation Rate',
      value: statistics.allocation_rate,
      icon: '✅',
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      textColor: 'text-teal-700 dark:text-teal-400',
    },
    {
      title: 'Total Travel',
      value: `${statistics.total_travel_km.toFixed(0)} km`,
      icon: '🛣️',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      textColor: 'text-indigo-700 dark:text-indigo-400',
    },
  ];

  return (
    <div>
      {/* Last Updated */}
      {lastUpdated && (
        <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live data • Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`${card.bgColor} rounded-lg p-4 border shadow-sm transition-transform hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${card.textColor}`}>
              {card.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {card.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
