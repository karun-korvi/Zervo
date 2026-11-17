import React, { useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { ArrowRight, MapPin } from 'lucide-react';
import { LatLngPoint } from '../types/zevro';

export interface FleetMapMarkerItem {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  coords: LatLngPoint;
  badgeText: string;
  tone: 'amber' | 'crimson' | 'cobalt' | 'emerald';
  actionLabel: string;
}

interface LiveFleetOverviewMapProps {
  hasApiKey: boolean;
  items: FleetMapMarkerItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onOpenLiveWork: (id: string) => void;
  title: string;
  subtitle: string;
}

const MapViewportFitter: React.FC<{ items: FleetMapMarkerItem[]; selectedItemId: string | null }> = ({
  items,
  selectedItemId,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || items.length === 0) return;

    const selected = selectedItemId ? items.find((item) => item.id === selectedItemId) : null;
    if (selected && items.length > 1) {
      map.panTo(selected.coords);
      return;
    }

    if (items.length === 1) {
      map.setCenter(items[0].coords);
      map.setZoom(13);
      return;
    }

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;
    items.forEach((item) => {
      if (item.coords.lat > north) north = item.coords.lat;
      if (item.coords.lat < south) south = item.coords.lat;
      if (item.coords.lng > east) east = item.coords.lng;
      if (item.coords.lng < west) west = item.coords.lng;
    });
    map.fitBounds(
      { north, south, east, west },
      { top: 48, right: 48, bottom: 48, left: 48 }
    );
  }, [map, items, selectedItemId]);

  return null;
};

interface PinProps {
  item: FleetMapMarkerItem;
  isSelected: boolean;
  isOpen: boolean;
  onMarkerClick: () => void;
  onClose: () => void;
  onOpenLiveWork: () => void;
}

const FleetZonePin: React.FC<PinProps> = ({
  item,
  isSelected,
  isOpen,
  onMarkerClick,
  onClose,
  onOpenLiveWork,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const colorClasses =
    item.tone === 'amber'
      ? isSelected
        ? 'border-[#92400e] bg-[#d97706] text-white'
        : 'border-[#d97706] bg-white text-[#92400e]'
      : item.tone === 'emerald'
      ? isSelected
        ? 'border-[#047857] bg-[#059669] text-white'
        : 'border-[#059669] bg-white text-[#047857]'
      : isSelected
      ? 'border-[#9f1239] bg-[#e23744] text-white'
      : 'border-[#e23744] bg-white text-[#be123c]';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={item.coords}
        onClick={onMarkerClick}
        zIndex={isSelected ? 30 : 10}
        title={item.title}
      >
        <div
          className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-[11px] font-bold shadow-md transition-transform ${
            isSelected ? 'scale-105' : ''
          } ${colorClasses}`}
        >
          <span className="font-mono tabular-nums whitespace-nowrap">{item.badgeText}</span>
        </div>
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={250}>
          <div className="p-0.5 text-xs text-[#18181b]">
            <p className="font-bold leading-snug">{item.title}</p>
            <p className="mt-1 text-[#52525b]">{item.subtitle}</p>
            <p className="mt-1 font-mono text-[11px] font-semibold text-[#e23744]">
              {item.city}
            </p>
            <button
              type="button"
              onClick={onOpenLiveWork}
              className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-[#e23744] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#be123c] cursor-pointer"
            >
              <span>{item.actionLabel}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const LiveFleetOverviewMap: React.FC<LiveFleetOverviewMapProps> = ({
  hasApiKey,
  items,
  selectedItemId,
  onSelectItem,
  onOpenLiveWork,
  title,
  subtitle,
}) => {
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  const defaultCenter = useMemo(
    () => items[0]?.coords ?? { lat: 12.9784, lng: 77.6408 },
    [items]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e4e7] bg-[#fcfbfa] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff1f2] text-[#e23744] shrink-0">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-[#18181b]">{title}</p>
            <p className="text-[11px] text-[#52525b]">{subtitle}</p>
          </div>
        </div>
        <span className="font-mono text-xs font-semibold text-[#059669] tabular-nums">
          {items.length} active pins
        </span>
      </div>

      <div className="relative h-[320px] w-full bg-[#f4f4f5] sm:h-[360px]">
        {hasApiKey ? (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultCenter}
            defaultZoom={5}
            gestureHandling="greedy"
            streetViewControl={false}
            mapTypeControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="h-full w-full"
          >
            <MapViewportFitter items={items} selectedItemId={selectedItemId} />
            {items.map((item) => (
              <FleetZonePin
                key={item.id}
                item={item}
                isSelected={selectedItemId === item.id}
                isOpen={openInfoId === item.id}
                onMarkerClick={() => {
                  onSelectItem(item.id);
                  setOpenInfoId(item.id);
                }}
                onClose={() => setOpenInfoId(null)}
                onOpenLiveWork={() => onOpenLiveWork(item.id)}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="flex h-full flex-col justify-between bg-[#fcfbfa] p-4">
            <div className="grid grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenLiveWork(item.id)}
                  className="flex items-center justify-between rounded-xl border border-[#e4e4e7] bg-white p-3 text-left hover:border-[#e23744] cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-xs font-bold text-[#18181b]">{item.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#52525b]">{item.city}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#e23744] whitespace-nowrap">
                    {item.badgeText}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
