import { useEffect, useState } from 'react';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-sync every 30 seconds if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncOfflineData();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncOfflineData = async () => {
    if (!navigator.onLine) return;

    const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
    
    if (offlineBookings.length === 0) return;

    setIsSyncing(true);
    console.log('🔄 Starting offline sync...');

    let syncedCount = 0;
    let failedCount = 0;

    for (const booking of offlineBookings) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...booking,
              offline_synced: true,
              original_offline_id: booking.id
            })
          }
        );

        if (response.ok) {
          syncedCount++;
          console.log(`✅ Synced: ${booking.id}`);
        } else {
          failedCount++;
          console.error(`❌ Failed: ${booking.id}`, await response.text());
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Error syncing: ${booking.id}`, error);
      }
    }

    // Clear successfully synced bookings
    if (syncedCount > 0) {
      localStorage.setItem('offline_bookings', JSON.stringify(
        offlineBookings.slice(syncedCount)
      ));
      console.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);
    }

    setIsSyncing(false);
  };

  const saveOfflineBooking = (booking: any) => {
    const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
    const offlineBooking = {
      ...booking,
      id: booking.id || `offline_${Date.now()}`,
      offline: true,
      saved_at: new Date().toISOString()
    };
    offlineBookings.push(offlineBooking);
    localStorage.setItem('offline_bookings', JSON.stringify(offlineBookings));
    return offlineBooking;
  };

  const getOfflineBookings = () => {
    return JSON.parse(localStorage.getItem('offline_bookings') || '[]');
  };

  const clearOfflineBookings = () => {
    localStorage.setItem('offline_bookings', '[]');
  };

  return {
    isOnline,
    isSyncing,
    syncOfflineData,
    saveOfflineBooking,
    getOfflineBookings,
    clearOfflineBookings
  };
};
