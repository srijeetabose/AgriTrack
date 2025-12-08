/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate estimated time of arrival (ETA) in minutes
 * Assumes average speed of 25 km/h for tractors on road
 */
function calculateETA(distanceKm, currentSpeed = 0) {
  // If machine is moving, use current speed + buffer
  // If idle, assume it will travel at average tractor speed (25 km/h)
  const avgSpeed = currentSpeed > 5 ? currentSpeed : 25; // km/h
  const hours = distanceKm / avgSpeed;
  const minutes = Math.ceil(hours * 60);
  
  return minutes;
}

/**
 * Format ETA for display
 */
function formatETA(minutes) {
  if (minutes < 60) {
    return `${minutes} mins`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days}+ days`;
  }
}

/**
 * Get compass direction from bearing
 */
function getDirection(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180 / Math.PI + 360) % 360;
  
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  
  return directions[index];
}

module.exports = {
  calculateDistance,
  calculateETA,
  formatETA,
  getDirection
};
