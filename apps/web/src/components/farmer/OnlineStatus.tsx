import { Wifi, WifiOff } from 'lucide-react';

interface OnlineStatusProps {
  isOnline: boolean;
  isSyncing?: boolean;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({ isOnline, isSyncing }) => {
  if (isOnline && !isSyncing) {
    return (
      <div className="bg-green-100 text-green-800 py-2 px-4 text-center text-sm flex items-center justify-center gap-2">
        <Wifi size={16} />
        <span>Online</span>
      </div>
    );
  }

  if (isOnline && isSyncing) {
    return (
      <div className="bg-blue-100 text-blue-800 py-2 px-4 text-center text-sm flex items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
        <span>Syncing offline data...</span>
      </div>
    );
  }

  return (
    <div className="bg-orange-100 text-orange-800 py-2 px-4 text-center text-sm flex items-center justify-center gap-2">
      <WifiOff size={16} />
      <span>Offline - Bookings will sync when online</span>
    </div>
  );
};
