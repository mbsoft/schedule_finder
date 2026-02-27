export function calculateDriveTimeEstimate(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const R = 3959; // Earth radius in miles
  const lat1 = (fromLat * Math.PI) / 180;
  const lng1 = (fromLng * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const lng2 = (toLng * Math.PI) / 180;
  const dlat = lat2 - lat1;
  const dlng = lng2 - lng1;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  const distanceMiles = R * c;
  // Assume average 30 mph for UK suburban driving
  const driveTimeMins = Math.floor((distanceMiles / 30) * 60);
  return Math.max(10, driveTimeMins); // Minimum 10 mins
}
