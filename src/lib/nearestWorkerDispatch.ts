import {
  BusinessSegment,
  LatLngPoint,
  ServiceCategory,
  VerifiedPro,
} from '../types/zevro';

export interface RankedWorkerCandidate {
  rank: number;
  pro: VerifiedPro;
  distanceKm: number;
  etaMinutes: number;
  exactTradeMatch: boolean;
  sameCityMatch: boolean;
  matchReason: string;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance in kilometers between two GPS points.
 */
export function haversineDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const dist = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  return Number(Math.max(0.4, dist).toFixed(1));
}

export function estimateEtaMinutes(distanceKm: number): number {
  return Math.max(5, Math.round(distanceKm * 4.2 + 3));
}

export function formatLiveDistance(distanceKm: number, progress = 0): string {
  if (progress >= 0.995) return '0 m';
  const remainingKm = Math.max(0, distanceKm * (1 - progress));
  if (remainingKm < 1) {
    const meters = Math.max(10, Math.round((remainingKm * 1000) / 10) * 10);
    return `${meters} m`;
  }
  return `${remainingKm.toFixed(1)} km`;
}

export function formatLiveEta(etaMinutes: number, progress = 0): string {
  if (progress >= 0.995) return 'Arrived';
  const remainingEta = Math.max(0, Math.round(etaMinutes * (1 - progress)));
  if (remainingEta <= 0) return '< 1 min';
  return `${remainingEta} min`;
}

export function buildZomatoArrivalMessage(params: {
  workerName: string;
  distanceKm: number;
  etaMinutes: number;
  progress: number;
  dispatchStatus?: 'Pinging Nearest' | 'Accepted' | 'Fallback Reassigned';
  stage?: number;
  status?: string;
}): string {
  const { workerName, distanceKm, etaMinutes, progress, dispatchStatus, stage, status } = params;
  if (status === 'Completed' || stage === 3) {
    return `${workerName} completed the service · Escrow settled`;
  }
  if (status === 'Cancelled') {
    return 'Booking cancelled · Escrow voided';
  }
  if (stage === 0 && dispatchStatus === 'Pinging Nearest') {
    const dist = formatLiveDistance(distanceKm, 0);
    const eta = formatLiveEta(etaMinutes, 0);
    return `Pinging nearest worker ${workerName} · ${dist} away · ${eta} ETA`;
  }
  if (progress >= 0.995 || stage === 2) {
    return `${workerName} has arrived at your doorstep · Work in progress`;
  }
  const distText = formatLiveDistance(distanceKm, progress);
  const etaText = formatLiveEta(etaMinutes, progress);
  const remainingMeters = Math.max(0, distanceKm * (1 - progress) * 1000);
  if (remainingMeters <= 100) {
    return `${workerName} is arriving now · ${distText} away · takes ${etaText}`;
  }
  return `${workerName} is coming · ${distText} away · takes ${etaText}`;
}

/**
 * Maps free-text booking titles/queries to one of ZEVRO's 15 service categories
 * so custom requests also auto-route to the nearest concerned trade worker.
 */
export function inferCategoryFromTitle(
  title: string,
  fallback: Exclude<ServiceCategory, 'All'> = 'Home Services'
): Exclude<ServiceCategory, 'All'> {
  const q = title.toLowerCase();
  if (/(picker|packer|warehouse|inventory|loader|sorting|logistics|dark store|retail|stock)/.test(q)) {
    return 'Logistics & Warehouse';
  }
  if (/(puncture|mechanic|car|bike|towing|battery|driver|roadside|vehicle)/.test(q)) {
    return 'Vehicle & Transportation';
  }
  if (/(doctor|physician|nurse|hospital|ward|clinic|physio|patient|medical|counsellor)/.test(q)) {
    return 'Healthcare & Medical';
  }
  if (/(swim|coach|tutor|teacher|math|physics|coding|python|class|exam|music|dance)/.test(q)) {
    return 'Education & Tutoring';
  }
  if (/(clean|deep clean|housekeep|maid|laundry|iron|dishwash|saniti|pest)/.test(q)) {
    return 'Cleaning & Housekeeping';
  }
  if (/(cook|chef|meal|tiffin|cater|bak|dietitian|nutrition|pantry)/.test(q)) {
    return 'Food & Cooking';
  }
  if (/(guard|security|bouncer|cctv|watchman|patrol)/.test(q)) {
    return 'Security Services';
  }
  if (/(salon|hair|barber|beauty|makeup|massage|trainer|fitness|mehendi|tailor)/.test(q)) {
    return 'Personal Care & Beauty';
  }
  if (/(baby|nanny|elderly|childcare|caregiver)/.test(q)) {
    return 'Childcare & Elderly Care';
  }
  if (/(event|wedding|stage|dj|photo|video|decor|host)/.test(q)) {
    return 'Events & Entertainment';
  }
  if (/(pet|dog|cat|groom|vet)/.test(q)) {
    return 'Pet Care';
  }
  if (/(software|developer|web|app|design|ui|ux|it |digital|seo|consultant|network|wifi)/.test(q)) {
    return 'IT & Digital Services';
  }
  if (/(ca |chartered|gst|tax|audit|accountant)/.test(q)) {
    return 'Professional Services';
  }
  if (/(factory|manufactur|assembly|welder|mason|civil|architect|site|maint)/.test(q)) {
    return 'Construction & Maintenance';
  }
  if (/(electric|plumb|ac |hvac|fridge|washer|ro |carpenter|paint|locksmith|interior)/.test(q)) {
    return 'Home Services';
  }
  return fallback;
}

export interface FindNearestWorkersOptions {
  pros: VerifiedPro[];
  category: Exclude<ServiceCategory, 'All'>;
  city: string;
  siteCoords: LatLngPoint;
  segment?: BusinessSegment;
  excludeWorkerIds?: string[];
  limit?: number;
}

/**
 * Zomato-style nearest concerned worker router:
 * 1) Filters active workers matching the concerned service category
 * 2) Prioritizes workers operating in the target metro hub
 * 3) Ranks strictly by Haversine GPS distance from worker's live location to customer site
 */
export function findNearestConcernedWorkers({
  pros,
  category,
  city,
  siteCoords,
  excludeWorkerIds = [],
  limit = 4,
}: FindNearestWorkersOptions): RankedWorkerCandidate[] {
  const excluded = new Set(excludeWorkerIds);

  const scored = pros
    .filter((pro) => !excluded.has(pro.id))
    .map((pro) => {
      const distanceKm = haversineDistanceKm(pro.currentCoords, siteCoords);
      const exactTradeMatch = pro.primaryTrade === category;
      const sameCityMatch = pro.city === city;
      const etaMinutes = estimateEtaMinutes(distanceKm);

      const reasonParts: string[] = [];
      reasonParts.push(
        exactTradeMatch ? `Matched ${pro.primaryTrade}` : `${pro.primaryTrade} Backup`
      );
      reasonParts.push(`${distanceKm.toFixed(1)} km away`);
      reasonParts.push(`${pro.rating.toFixed(2)}★`);

      return {
        pro,
        distanceKm,
        etaMinutes,
        exactTradeMatch,
        sameCityMatch,
        matchReason: reasonParts.join(' · '),
      };
    })
    .sort((a, b) => {
      if (a.exactTradeMatch !== b.exactTradeMatch) {
        return a.exactTradeMatch ? -1 : 1;
      }
      if (a.sameCityMatch !== b.sameCityMatch) {
        return a.sameCityMatch ? -1 : 1;
      }
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.pro.onTimeRate !== b.pro.onTimeRate) {
        return b.pro.onTimeRate - a.pro.onTimeRate;
      }
      return b.pro.rating - a.pro.rating;
    });

  return scored.slice(0, limit).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
