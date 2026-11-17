import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Navigation, Pause, Play, RotateCcw } from 'lucide-react';
import { formatLiveDistance, formatLiveEta } from '../lib/nearestWorkerDispatch';
import { LatLngPoint } from '../types/zevro';

interface LiveDispatchMapProps {
  hasApiKey: boolean;
  workTitle: string;
  hubName: string;
  hubCoords: LatLngPoint;
  siteName: string;
  siteCoords: LatLngPoint;
  proLabel: string;
  distanceKm: number;
  etaMinutes: number;
  progress: number; // 0 to 1
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetRoute: () => void;
}

function buildFallbackCorridor(
  origin: LatLngPoint,
  destination: LatLngPoint,
  steps = 28
): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const perpLat = -dLng * 0.14;
  const perpLng = dLat * 0.14;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI);
    const roadJitter = Math.sin(t * Math.PI * 3) * 0.04;
    points.push({
      lat: origin.lat + dLat * t + perpLat * (curve + roadJitter),
      lng: origin.lng + dLng * t + perpLng * (curve + roadJitter),
    });
  }
  return points;
}

function interpolateAlongPath(path: LatLngPoint[], progress: number): LatLngPoint {
  if (path.length === 0) return { lat: 12.9784, lng: 77.6408 };
  if (path.length === 1 || progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  const scaled = progress * (path.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const p1 = path[idx];
  const p2 = path[Math.min(idx + 1, path.length - 1)];

  return {
    lat: p1.lat + (p2.lat - p1.lat) * frac,
    lng: p1.lng + (p2.lng - p1.lng) * frac,
  };
}

function splitPathAtProgress(path: LatLngPoint[], progress: number): LatLngPoint[] {
  if (path.length === 0) return [];
  if (progress <= 0) return [path[0]];
  if (progress >= 1) return path;

  const scaled = progress * (path.length - 1);
  const idx = Math.floor(scaled);
  const slice = path.slice(0, idx + 1);
  slice.push(interpolateAlongPath(path, progress));
  return slice;
}

interface MapPolylineInstance {
  setMap: (map: unknown) => void;
  setPath: (path: LatLngPoint[]) => void;
  get: (key: string) => unknown;
  set: (key: string, val: unknown) => void;
}

function computeBoundsLiteral(points: LatLngPoint[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const pt of points) {
    if (pt.lat > north) north = pt.lat;
    if (pt.lat < south) south = pt.lat;
    if (pt.lng > east) east = pt.lng;
    if (pt.lng < west) west = pt.lng;
  }
  return { north, south, east, west };
}

interface RouteOverlayProps {
  origin: LatLngPoint;
  destination: LatLngPoint;
  progress: number;
  isPlaying: boolean;
  onPathResolved: (path: LatLngPoint[], computedMeters?: number, computedSeconds?: number) => void;
}

const RunningRouteOverlay: React.FC<RouteOverlayProps> = ({
  origin,
  destination,
  progress,
  isPlaying,
  onPathResolved,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const mapsLib = useMapsLibrary('maps');

  const basePolylineRef = useRef<MapPolylineInstance | null>(null);
  const activePolylineRef = useRef<MapPolylineInstance | null>(null);
  const [resolvedPath, setResolvedPath] = useState<LatLngPoint[]>(() =>
    buildFallbackCorridor(origin, destination)
  );
  const arrowOffsetRef = useRef(0);

  // Compute route via modern google.maps.routes.Route.computeRoutes
  useEffect(() => {
    const fallback = buildFallbackCorridor(origin, destination);
    setResolvedPath(fallback);
    onPathResolved(fallback);

    if (!map) return;

    map.fitBounds(computeBoundsLiteral([origin, destination]), {
      top: 56,
      right: 56,
      bottom: 56,
      left: 56,
    });

    const RouteClass = (routesLib as unknown as {
      Route?: {
        computeRoutes?: (req: Record<string, unknown>) => Promise<{
          routes?: Array<{
            path?: Array<{ lat: () => number; lng: () => number }>;
            distanceMeters?: number;
            durationMillis?: number;
            viewport?: unknown;
          }>;
        }>;
      };
    } | null)?.Route;

    if (!RouteClass?.computeRoutes) {
      return;
    }

    let cancelled = false;

    RouteClass.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
      .then((res) => {
        if (cancelled) return;
        const primaryRoute = res?.routes?.[0];
        if (!primaryRoute) return;

        if (primaryRoute.path && primaryRoute.path.length > 1) {
          const pts = primaryRoute.path.map((pt) => ({
            lat: typeof pt.lat === 'function' ? pt.lat() : (pt as unknown as LatLngPoint).lat,
            lng: typeof pt.lng === 'function' ? pt.lng() : (pt as unknown as LatLngPoint).lng,
          }));
          setResolvedPath(pts);
          onPathResolved(
            pts,
            primaryRoute.distanceMeters,
            primaryRoute.durationMillis ? Math.round(primaryRoute.durationMillis / 1000) : undefined
          );
          map.fitBounds(computeBoundsLiteral(pts), {
            top: 56,
            right: 56,
            bottom: 56,
            left: 56,
          });
        } else if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport as never, {
            top: 56,
            right: 56,
            bottom: 56,
            left: 56,
          });
        }
      })
      .catch((err: unknown) => {
        const errText = String(err);
        if (
          errText.includes('RESOURCE_EXHAUSTED') ||
          errText.includes('OVER_QUERY_LIMIT') ||
          errText.includes('QuotaExceededError') ||
          errText.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  // Create and maintain Base Planned Polyline + Active Running Polyline
  useEffect(() => {
    if (!map || !mapsLib) return;

    const PolylineCtor = (mapsLib as unknown as {
      Polyline: new (opts: Record<string, unknown>) => MapPolylineInstance;
    }).Polyline;

    const forwardArrowPath =
      (mapsLib as unknown as { SymbolPath?: { FORWARD_CLOSED_ARROW?: number } })
        .SymbolPath?.FORWARD_CLOSED_ARROW ?? 1;

    const baseLine = new PolylineCtor({
      path: resolvedPath,
      geodesic: true,
      strokeColor: '#fda4af',
      strokeOpacity: 0.85,
      strokeWeight: 5,
      icons: [
        {
          icon: {
            path: forwardArrowPath,
            scale: 2.6,
            strokeColor: '#be123c',
            fillColor: '#e23744',
            fillOpacity: 0.95,
          },
          offset: '0%',
          repeat: '52px',
        },
      ],
      map,
    });

    const activeLine = new PolylineCtor({
      path: splitPathAtProgress(resolvedPath, progress),
      geodesic: true,
      strokeColor: '#059669',
      strokeOpacity: 1,
      strokeWeight: 6,
      zIndex: 10,
      map,
    });

    basePolylineRef.current = baseLine;
    activePolylineRef.current = activeLine;

    return () => {
      baseLine.setMap(null);
      activeLine.setMap(null);
      basePolylineRef.current = null;
      activePolylineRef.current = null;
    };
  }, [map, mapsLib, resolvedPath]);

  useEffect(() => {
    if (!activePolylineRef.current) return;
    activePolylineRef.current.setPath(splitPathAtProgress(resolvedPath, progress));
  }, [resolvedPath, progress]);

  useEffect(() => {
    if (!isPlaying) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      const baseLine = basePolylineRef.current;
      if (!baseLine) return;
      arrowOffsetRef.current = (arrowOffsetRef.current + 2) % 100;
      const icons = baseLine.get('icons');
      if (Array.isArray(icons) && icons[0]) {
        icons[0].offset = `${arrowOffsetRef.current}%`;
        baseLine.set('icons', icons);
      }
    }, 90);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  return null;
};

export const LiveDispatchMap: React.FC<LiveDispatchMapProps> = ({
  hasApiKey,
  workTitle,
  hubName,
  hubCoords,
  siteName,
  siteCoords,
  proLabel,
  distanceKm,
  etaMinutes,
  progress,
  isPlaying,
  onTogglePlay,
  onResetRoute,
}) => {
  const [routePath, setRoutePath] = useState<LatLngPoint[]>(() =>
    buildFallbackCorridor(hubCoords, siteCoords)
  );
  const [liveDistanceKm, setLiveDistanceKm] = useState(distanceKm);
  const [liveEtaMins, setLiveEtaMins] = useState(etaMinutes);

  const [hubInfoOpen, setHubInfoOpen] = useState(false);
  const [siteInfoOpen, setSiteInfoOpen] = useState(false);
  const [hubMarkerRef, hubMarker] = useAdvancedMarkerRef();
  const [siteMarkerRef, siteMarker] = useAdvancedMarkerRef();

  useEffect(() => {
    setRoutePath(buildFallbackCorridor(hubCoords, siteCoords));
    setLiveDistanceKm(distanceKm);
    setLiveEtaMins(etaMinutes);
  }, [hubCoords.lat, hubCoords.lng, siteCoords.lat, siteCoords.lng, distanceKm, etaMinutes]);

  const workerPosition = useMemo(
    () => interpolateAlongPath(routePath, progress),
    [routePath, progress]
  );

  const midpoint = useMemo(
    () => ({
      lat: (hubCoords.lat + siteCoords.lat) / 2,
      lng: (hubCoords.lng + siteCoords.lng) / 2,
    }),
    [hubCoords, siteCoords]
  );

  const distanceText = formatLiveDistance(liveDistanceKm, progress);
  const etaText = formatLiveEta(liveEtaMins, progress);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white">
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e4e7] bg-[#fcfbfa] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e23744] text-white shrink-0">
            <Navigation className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-[#18181b]">
              Live Worker Location · {proLabel} ({distanceText} away · {etaText === 'Arrived' ? 'Arrived' : `takes ${etaText}`})
            </p>
            <p className="text-[11px] font-medium text-[#52525b]">
              {hubName} → {siteName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#d4d4d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 text-[#e23744]" aria-hidden="true" />
                <span>Pause Line</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                <span>Run Live Line</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onResetRoute}
            aria-label="Replay route line from origin hub"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-semibold text-[#52525b] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Replay</span>
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative h-[380px] w-full bg-[#f4f4f5] sm:h-[440px]">
        {hasApiKey ? (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={midpoint}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            streetViewControl={false}
            mapTypeControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="h-full w-full"
          >
            <RunningRouteOverlay
              origin={hubCoords}
              destination={siteCoords}
              progress={progress}
              isPlaying={isPlaying}
              onPathResolved={(pts, meters, secs) => {
                setRoutePath(pts);
                if (typeof meters === 'number' && meters > 0) {
                  setLiveDistanceKm(Number((meters / 1000).toFixed(1)));
                }
                if (typeof secs === 'number' && secs > 0) {
                  setLiveEtaMins(Math.max(4, Math.round(secs / 60)));
                }
              }}
            />

            {/* Origin Dispatch Hub Marker */}
            <AdvancedMarker
              ref={hubMarkerRef}
              position={hubCoords}
              onClick={() => setHubInfoOpen(true)}
              title={`Origin Hub: ${hubName}`}
            >
              <div className="flex items-center gap-1.5 rounded-lg border border-[#e23744] bg-white px-2.5 py-1 text-[11px] font-bold text-[#be123c] shadow-md">
                <span className="h-2 w-2 rounded-full bg-[#e23744]" />
                <span>HUB</span>
              </div>
            </AdvancedMarker>

            {hubInfoOpen && hubMarker && (
              <InfoWindow
                anchor={hubMarker}
                onCloseClick={() => setHubInfoOpen(false)}
                maxWidth={220}
              >
                <div className="text-xs text-[#18181b]">
                  <p className="font-bold">Origin: {hubName}</p>
                  <p className="mt-0.5 text-[#52525b]">Dispatch crew staged &amp; verified</p>
                </div>
              </InfoWindow>
            )}

            {/* Moving Worker / Pro Marker */}
            <AdvancedMarker
              position={workerPosition}
              zIndex={40}
              title={`${proLabel} · ${distanceText} away (${etaText})`}
            >
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 rounded-full border-2 border-white bg-[#059669] px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  <span className="whitespace-nowrap">
                    {progress >= 0.995
                      ? `${proLabel} · Arrived`
                      : `${proLabel} · ${distanceText} · ${etaText}`}
                  </span>
                </div>
                <div className="mt-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#059669] shadow" />
              </div>
            </AdvancedMarker>

            {/* Destination Customer / Site Marker */}
            <AdvancedMarker
              ref={siteMarkerRef}
              position={siteCoords}
              onClick={() => setSiteInfoOpen(true)}
              title={`Destination: ${siteName}`}
            >
              <div className="flex items-center gap-1.5 rounded-lg border border-[#18181b] bg-[#18181b] px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                <span>SITE</span>
              </div>
            </AdvancedMarker>

            {siteInfoOpen && siteMarker && (
              <InfoWindow
                anchor={siteMarker}
                onCloseClick={() => setSiteInfoOpen(false)}
                maxWidth={240}
              >
                <div className="text-xs text-[#18181b]">
                  <p className="font-bold">{siteName}</p>
                  <p className="mt-0.5 text-[#52525b]">{workTitle}</p>
                  <p className="mt-1 font-mono font-semibold text-[#059669]">
                    {etaText === 'Arrived' ? 'Worker Arrived' : `ETA: ${etaText} (${distanceText} left)`}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="relative flex h-full w-full flex-col justify-between bg-[#fcfbfa] p-5">
            <svg
              viewBox="0 0 800 380"
              className="h-full w-full rounded-xl border border-[#e4e4e7] bg-white"
              role="img"
              aria-label={`Live corridor map from ${hubName} to ${siteName}`}
            >
              <defs>
                <pattern id="zevro-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f4f4f5" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="800" height="380" fill="url(#zevro-grid)" />
              <path
                d="M 110 290 C 260 270, 320 120, 460 150 S 600 110, 690 95"
                fill="none"
                stroke="#fecdd3"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 110 290 C 260 270, 320 120, 460 150 S 600 110, 690 95"
                fill="none"
                stroke="#059669"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="680"
                strokeDashoffset={Math.round(680 * (1 - progress))}
              />
              <circle cx="110" cy="290" r="10" fill="#e23744" stroke="#ffffff" strokeWidth="3" />
              <text x="110" y="322" textAnchor="middle" fill="#be123c" fontSize="12" fontWeight="700">
                {hubName}
              </text>
              <circle cx="690" cy="95" r="10" fill="#18181b" stroke="#ffffff" strokeWidth="3" />
              <text x="680" y="74" textAnchor="end" fill="#18181b" fontSize="12" fontWeight="700">
                {siteName}
              </text>
              <circle
                cx={110 + 580 * progress}
                cy={290 - 195 * progress - Math.sin(progress * Math.PI) * 35}
                r="13"
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="3"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Live Telemetry Strip */}
      <dl
        aria-live="polite"
        className="grid grid-cols-2 divide-y divide-[#e4e4e7] border-t border-[#e4e4e7] bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="px-4 py-3">
          <dt className="text-[11px] font-semibold text-[#71717a]">Route Completion</dt>
          <dd className="mt-0.5 font-mono text-base font-extrabold text-[#e23744] tabular-nums">
            {Math.round(progress * 100)}%
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[11px] font-semibold text-[#71717a]">Distance Remaining</dt>
          <dd className="mt-0.5 font-mono text-base font-extrabold text-[#18181b] tabular-nums">
            {distanceText}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[11px] font-semibold text-[#71717a]">Live Arrival ETA</dt>
          <dd className="mt-0.5 font-mono text-base font-extrabold text-[#059669] tabular-nums">
            {etaText}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[11px] font-semibold text-[#71717a]">GPS Telemetry</dt>
          <dd className="mt-0.5 font-mono text-xs font-bold text-[#52525b] tabular-nums">
            {workerPosition.lat.toFixed(4)}, {workerPosition.lng.toFixed(4)}
          </dd>
        </div>
      </dl>
    </div>
  );
};
