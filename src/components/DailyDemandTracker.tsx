import React, { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Users } from 'lucide-react';
import { DAILY_DEMAND_METRICS } from '../data/zevroData';
import { DailyDemandMetric, WorkspaceMode } from '../types/zevro';
import { FleetMapMarkerItem, LiveFleetOverviewMap } from './LiveFleetOverviewMap';
import { ResilientImage } from './ResilientImage';

interface DailyDemandTrackerProps {
  hasApiKey: boolean;
  mode?: WorkspaceMode;
  selectedCity: string;
  allCities: boolean;
  onOpenDemandWork: (metric: DailyDemandMetric) => void;
}

export const DailyDemandTracker: React.FC<DailyDemandTrackerProps> = ({
  hasApiKey,
  mode = 'consumer',
  selectedCity,
  allCities,
  onOpenDemandWork,
}) => {
  const [selectedMetricId, setSelectedMetricId] = useState<string>(
    DAILY_DEMAND_METRICS[0]?.id ?? ''
  );

  const visibleMetrics = useMemo(() => {
    if (allCities) return DAILY_DEMAND_METRICS;
    const filtered = DAILY_DEMAND_METRICS.filter((m) => m.city === selectedCity);
    return filtered.length > 0 ? filtered : DAILY_DEMAND_METRICS;
  }, [allCities, selectedCity]);

  const totals = useMemo(() => {
    const needed = visibleMetrics.reduce((sum, m) => sum + m.workersNeededToday, 0);
    const assigned = visibleMetrics.reduce((sum, m) => sum + m.workersAssignedToday, 0);
    const openGap = Math.max(0, needed - assigned);
    return { needed, assigned, openGap };
  }, [visibleMetrics]);

  const mapMarkers: FleetMapMarkerItem[] = useMemo(
    () =>
      visibleMetrics.map((m) => {
        const openSlots = Math.max(0, m.workersNeededToday - m.workersAssignedToday);
        return {
          id: m.id,
          title: m.tradeTitle,
          subtitle: `${m.workersAssignedToday}/${m.workersNeededToday} deployed · ${openSlots} workers needed today`,
          city: `${m.zoneName}, ${m.city}`,
          coords: m.zoneCoords,
          badgeText: `${openSlots} needed · ${m.zoneName.split('&')[0].trim()}`,
          tone:
            m.demandLevel === 'Peak Demand'
              ? 'amber'
              : m.demandLevel === 'High Demand'
              ? 'crimson'
              : 'emerald',
          actionLabel: 'Track Live Route',
        };
      }),
    [visibleMetrics]
  );

  return (
    <section
      aria-labelledby="daily-demand-heading"
      className="mt-14 rounded-2xl border border-[#e4e4e7] bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4 border-b border-[#e4e4e7] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.06em] text-[#d97706] uppercase">
            Daily Base Workforce &amp; Demand Tracker · Today
          </p>
          <h2
            id="daily-demand-heading"
            className="font-display mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-[#18181b]"
          >
            High-Demand Jobs &amp; Live Worker Requirement Map
          </h2>
          <p className="mt-1 text-sm text-[#52525b]">
            See which everyday B2B &amp; B2C jobs have the highest daily demand, exact workers needed per zone, and click any work to track its live route line.
          </p>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-[#e4e4e7] rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] px-2 py-2.5 text-xs shrink-0">
          <div className="px-3">
            <dt className="text-[#71717a]">Needed Today</dt>
            <dd className="mt-0.5 font-mono text-base font-extrabold text-[#18181b] tabular-nums">
              {totals.needed}
            </dd>
          </div>
          <div className="px-3">
            <dt className="text-[#71717a]">Deployed Live</dt>
            <dd className="mt-0.5 font-mono text-base font-extrabold text-[#059669] tabular-nums">
              {totals.assigned}
            </dd>
          </div>
          <div className="px-3">
            <dt className="text-[#71717a]">Open Slots</dt>
            <dd className="mt-0.5 font-mono text-base font-extrabold text-[#d97706] tabular-nums">
              {totals.openGap}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: Daily High-Demand Jobs & Worker Headcount Board */}
        <div className="space-y-3 lg:col-span-7">
          {visibleMetrics.map((metric) => {
            const openWorkers = Math.max(
              0,
              metric.workersNeededToday - metric.workersAssignedToday
            );
            const fillPct = Math.min(
              100,
              Math.round((metric.workersAssignedToday / metric.workersNeededToday) * 100)
            );
            const isSelected = selectedMetricId === metric.id;

            return (
              <div
                key={metric.id}
                className={`flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  isSelected
                    ? 'border-[#e23744] bg-[#fff1f2]/35'
                    : 'border-[#e4e4e7] bg-white hover:border-[#d4d4d8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMetricId(metric.id)}
                  className="flex flex-1 items-start gap-3.5 text-left min-w-0 cursor-pointer"
                >
                  <div className="h-14 w-16 overflow-hidden rounded-lg bg-[#f4f4f5] shrink-0">
                    <ResilientImage
                      src={metric.imageUrl}
                      alt={metric.imageAlt}
                      className="h-full w-full"
                      fallbackLabel={metric.category}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold">
                      <span
                        className={
                          metric.demandLevel === 'Peak Demand'
                            ? 'text-[#d97706]'
                            : metric.demandLevel === 'High Demand'
                            ? 'text-[#e23744]'
                            : 'text-[#059669]'
                        }
                      >
                        {metric.demandLevel}
                      </span>
                      <span aria-hidden="true" className="text-[#d4d4d8]">·</span>
                      <span className="text-[#71717a]">
                        {metric.segment} · {metric.category}
                      </span>
                      <span aria-hidden="true" className="text-[#d4d4d8]">·</span>
                      <span className="font-mono text-[#18181b] tabular-nums">
                        {metric.avgPayoutRange}
                      </span>
                    </div>

                    <h3 className="font-display mt-1 truncate text-sm font-bold text-[#18181b]">
                      {metric.tradeTitle}
                    </h3>

                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#52525b]">
                      <MapPin className="h-3.5 w-3.5 text-[#e23744] shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {metric.zoneName} · {metric.city}
                      </span>
                    </p>

                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e4e4e7]">
                        <div
                          className={`h-full rounded-full ${
                            metric.demandLevel === 'Peak Demand'
                              ? 'bg-[#d97706]'
                              : 'bg-[#059669]'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#18181b] tabular-nums whitespace-nowrap">
                        <Users className="h-3 w-3 text-[#52525b]" aria-hidden="true" />
                        {metric.workersAssignedToday}/{metric.workersNeededToday} active ·{' '}
                        <span className="text-[#d97706]">{openWorkers} needed</span>
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDemandWork(metric)}
                  className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'pro'
                      ? 'bg-[#059669] hover:bg-[#047857]'
                      : 'bg-[#e23744] hover:bg-[#be123c]'
                  }`}
                >
                  <span>
                    {mode === 'pro' ? 'Track & Claim' : 'Track Live Line'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Live Zone & Worker Requirement Google Map */}
        <div className="lg:sticky lg:top-24 lg:col-span-5">
          <LiveFleetOverviewMap
            hasApiKey={hasApiKey}
            items={mapMarkers}
            selectedItemId={selectedMetricId}
            onSelectItem={setSelectedMetricId}
            onOpenLiveWork={(id) => {
              const found = visibleMetrics.find((m) => m.id === id);
              if (found) onOpenDemandWork(found);
            }}
            title="Live Daily Demand Zones"
            subtitle="Click any pin to view open worker headcounts & launch live route"
          />
        </div>
      </div>
    </section>
  );
};
