import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { CITY_HUB_CENTERS } from '../data/zevroData';
import {
  buildZomatoArrivalMessage,
  findNearestConcernedWorkers,
  formatLiveDistance,
  formatLiveEta,
  inferCategoryFromTitle,
  RankedWorkerCandidate,
} from '../lib/nearestWorkerDispatch';
import {
  BookingRecord,
  DispatchStage,
  JobShift,
  LiveWorkTarget,
  ScreenId,
  ServiceOffering,
  VerifiedPro,
} from '../types/zevro';
import { LiveDispatchMap } from './LiveDispatchMap';
import { ResilientImage } from './ResilientImage';

interface WorkLiveTrackerViewProps {
  hasApiKey: boolean;
  target: LiveWorkTarget;
  returnScreen: ScreenId;
  claimedShiftIds: string[];
  allServices: ServiceOffering[];
  allShifts: JobShift[];
  allBookings: BookingRecord[];
  allPros: VerifiedPro[];
  onBack: () => void;
  onSelectTarget: (next: LiveWorkTarget) => void;
  onBookService: (service: ServiceOffering) => void;
  onClaimShift: (shift: JobShift) => void;
  onAdvanceStage: (bookingId: string) => void;
  onAcceptDispatch?: (bookingId: string) => void;
  onReassignWorker?: (bookingId: string, candidate: RankedWorkerCandidate) => void;
}

const DISPATCH_STAGES: { stage: DispatchStage; label: string; progressTarget: number; detail: string }[] = [
  {
    stage: 0,
    label: 'Hub Assigned',
    progressTarget: 0.14,
    detail: 'Crew & tools checked out from dispatch bay',
  },
  {
    stage: 1,
    label: 'Line Running · En Route',
    progressTarget: 0.56,
    detail: 'GPS route line active toward customer site',
  },
  {
    stage: 2,
    label: 'On-Site Work Active',
    progressTarget: 0.96,
    detail: 'Arrived on site · work checklist running',
  },
  {
    stage: 3,
    label: 'OTP & Escrow Settled',
    progressTarget: 1,
    detail: 'Completion verified · payout released',
  },
];

export const WorkLiveTrackerView: React.FC<WorkLiveTrackerViewProps> = ({
  hasApiKey,
  target,
  returnScreen,
  claimedShiftIds,
  allServices,
  allShifts,
  allBookings,
  allPros,
  onBack,
  onSelectTarget,
  onBookService,
  onClaimShift,
  onAdvanceStage,
  onAcceptDispatch,
  onReassignWorker,
}) => {
  const [progress, setProgress] = useState<number>(
    target.type === 'booking'
      ? target.booking.stage === 3
        ? 1
        : target.booking.stage === 2
        ? 0.92
        : target.booking.stage === 1
        ? 0.42
        : 0.12
      : 0.25
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(
    target.type !== 'booking' || target.booking.stage < 3
  );
  const [pingSecondsLeft, setPingSecondsLeft] = useState<number>(3);

  const activeBookingId = target.type === 'booking' ? target.booking.id : '';
  const activeBookingWorkerId =
    target.type === 'booking' ? target.booking.assignedWorkerId ?? '' : '';
  const activeBookingDispatchStatus =
    target.type === 'booking' ? target.booking.dispatchStatus ?? '' : '';
  const activeBookingStage =
    target.type === 'booking' ? target.booking.stage : 0;
  const activeBookingStatus =
    target.type === 'booking' ? target.booking.status : '';

  // Reset route simulation whenever the selected work or assigned worker changes
  useEffect(() => {
    if (target.type === 'booking') {
      const startProg =
        target.booking.stage === 3
          ? 1
          : target.booking.stage === 2
          ? 0.92
          : target.booking.stage === 1
          ? 0.22
          : 0.12;
      setProgress(startProg);
      setIsPlaying(target.booking.stage < 3);
      setPingSecondsLeft(3);
    } else {
      setProgress(0.22);
      setIsPlaying(true);
    }
  }, [
    target.type,
    target.type === 'service'
      ? target.service.id
      : target.type === 'shift'
      ? target.shift.id
      : target.booking.id,
    activeBookingWorkerId,
  ]);

  // Zomato-style auto-ping countdown: nearest worker receives ping & accepts into live route
  useEffect(() => {
    if (
      target.type !== 'booking' ||
      activeBookingStatus !== 'Active' ||
      activeBookingDispatchStatus !== 'Pinging Nearest' ||
      activeBookingStage !== 0 ||
      !onAcceptDispatch
    ) {
      return;
    }

    setPingSecondsLeft(3);
    const timer = window.setInterval(() => {
      setPingSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onAcceptDispatch(activeBookingId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    target.type,
    activeBookingId,
    activeBookingStatus,
    activeBookingDispatchStatus,
    activeBookingStage,
    activeBookingWorkerId,
    onAcceptDispatch,
  ]);

  // Smooth live marker movement along the active route line ("line running")
  useEffect(() => {
    if (!isPlaying) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          return target.type === 'booking' && target.booking.stage === 3 ? 1 : 0.08;
        }
        return Math.min(1, Number((prev + 0.012).toFixed(3)));
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [isPlaying, target]);

  const normalized = useMemo(() => {
    if (target.type === 'service') {
      const s = target.service;
      return {
        id: s.id,
        segment: s.segment,
        category: s.category,
        title: s.title,
        subtitle: s.summary,
        hubName: s.hubName,
        hubCoords: s.hubCoords,
        siteName: s.siteName,
        siteCoords: s.siteCoords,
        proLabel: s.segment === 'B2B' ? 'Assigned Crew En Route' : 'Verified Pro En Route',
        distanceKm: s.distanceKm,
        etaMinutes: s.etaMinutes,
        priceLabel: s.unitLabel,
        priceValue: `₹${s.flatPrice.toLocaleString('en-IN')}`,
        workersNeededToday: s.workersNeededToday,
        workersActiveToday: s.workersActiveToday,
        bullets: s.inclusions,
        imageUrl: s.imageUrl,
        imageAlt: s.imageAlt,
        cityLabel: s.cityAvailability[0] ?? 'Bengaluru · Indiranagar',
      };
    }

    if (target.type === 'shift') {
      const j = target.shift;
      const hubInfo = CITY_HUB_CENTERS[j.city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];
      return {
        id: j.id,
        segment: j.segment,
        category: j.trade,
        title: j.title,
        subtitle: j.brief,
        hubName: hubInfo.hubLabel,
        hubCoords: j.hubCoords,
        siteName: `${j.locality} (${j.employer})`,
        siteCoords: j.siteCoords,
        proLabel: 'Shift Route Active',
        distanceKm: j.distanceKm,
        etaMinutes: j.etaMinutes,
        priceLabel: `Guaranteed · ${j.durationHours}h`,
        priceValue: `₹${j.totalPayout.toLocaleString('en-IN')}`,
        workersNeededToday: j.workersNeededToday,
        workersActiveToday: j.workersAssignedToday,
        bullets: j.credentialsRequired,
        imageUrl: j.imageUrl,
        imageAlt: j.imageAlt,
        cityLabel: j.city,
      };
    }

    const b = target.booking;
    const hubInfo = CITY_HUB_CENTERS[b.city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];
    const matchedWorker = b.assignedWorkerId
      ? allPros.find((p) => p.id === b.assignedWorkerId)
      : undefined;
    return {
      id: b.id,
      segment: b.segment ?? 'B2C',
      category:
        b.serviceCategory ??
        (b.kind === 'claimed_shift' ? 'Claimed Shift' : inferCategoryFromTitle(b.title)),
      title: b.title,
      subtitle: b.notes ?? `${b.counterpartyName} · ${b.counterpartyMeta}`,
      hubName: matchedWorker
        ? `${matchedWorker.name} (${matchedWorker.locality})`
        : hubInfo.hubLabel,
      hubCoords: b.hubCoords ?? matchedWorker?.currentCoords ?? hubInfo.hub,
      siteName: `${b.address}, ${b.city}`,
      siteCoords: b.siteCoords ?? hubInfo.defaultSite,
      proLabel: b.counterpartyName,
      distanceKm: b.distanceKm ?? 2.8,
      etaMinutes: b.etaMinutes ?? 14,
      priceLabel: b.kind === 'claimed_shift' ? 'Guaranteed Payout' : 'Total Escrow Locked',
      priceValue: `₹${b.totalAmount.toLocaleString('en-IN')}`,
      workersNeededToday: 18,
      workersActiveToday: 14,
      bullets: [
        `Scheduled: ${b.scheduledSlot}`,
        `Escrow Ref: ${b.escrowCode}`,
        `${b.counterpartyName} (${b.counterpartyMeta})`,
      ],
      imageUrl: b.imageUrl ?? '',
      imageAlt: b.title,
      cityLabel: b.city,
    };
  }, [target, allPros]);

  const activeCategoryForQueue = useMemo(() => {
    if (target.type === 'service') return target.service.category;
    if (target.type === 'shift') return target.shift.trade;
    return (
      target.booking.serviceCategory ?? inferCategoryFromTitle(target.booking.title)
    );
  }, [target]);

  const rankedCandidates = useMemo(() => {
    return findNearestConcernedWorkers({
      pros: allPros,
      category: activeCategoryForQueue,
      city: normalized.cityLabel,
      siteCoords: normalized.siteCoords,
      segment: normalized.segment,
      limit: 4,
    });
  }, [allPros, activeCategoryForQueue, normalized.cityLabel, normalized.siteCoords, normalized.segment]);

  const nextFallbackCandidate = useMemo(() => {
    if (target.type !== 'booking') return rankedCandidates[1];
    return rankedCandidates.find((c) => c.pro.id !== target.booking.assignedWorkerId);
  }, [rankedCandidates, target]);

  const activeStageFromProgress: DispatchStage =
    target.type === 'booking'
      ? target.booking.stage
      : progress >= 0.99
      ? 3
      : progress >= 0.85
      ? 2
      : progress >= 0.18
      ? 1
      : 0;

  const isShiftClaimed =
    target.type === 'shift' && claimedShiftIds.includes(target.shift.id);

  const openGap = Math.max(
    0,
    normalized.workersNeededToday - normalized.workersActiveToday
  );

  const backLabel =
    returnScreen === 'jobs'
      ? 'Back to Open Jobs'
      : returnScreen === 'bookings'
      ? 'Back to Bookings'
      : 'Back to Services';

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Top Breadcrumb + Quick Work Switcher */}
      <div className="flex flex-col gap-4 border-b border-[#e4e4e7] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#d4d4d8] bg-white px-3.5 py-2 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{backLabel}</span>
          </button>

          <div>
            <p className="text-[11px] font-bold tracking-[0.06em] text-[#059669] uppercase">
              Live Work Route · Line Running ({normalized.segment} · {normalized.category})
            </p>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-[#18181b] sm:text-2xl">
              {normalized.title}
            </h1>
          </div>
        </div>

        {/* Quick Switcher across active works */}
        <div className="flex items-center gap-2">
          <label htmlFor="live-work-switcher" className="text-xs font-semibold text-[#52525b] whitespace-nowrap">
            Switch Work:
          </label>
          <select
            id="live-work-switcher"
            value={`${target.type}:${normalized.id}`}
            onChange={(e) => {
              const [kind, id] = e.target.value.split(':');
              if (kind === 'service') {
                const found = allServices.find((s) => s.id === id);
                if (found) onSelectTarget({ type: 'service', service: found });
              } else if (kind === 'shift') {
                const found = allShifts.find((s) => s.id === id);
                if (found) onSelectTarget({ type: 'shift', shift: found });
              } else if (kind === 'booking') {
                const found = allBookings.find((b) => b.id === id);
                if (found) onSelectTarget({ type: 'booking', booking: found });
              }
            }}
            className="min-h-[40px] max-w-[260px] truncate rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
          >
            <optgroup label="Active Bookings">
              {allBookings.map((b) => (
                <option key={b.id} value={`booking:${b.id}`}>
                  {b.id} · {b.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Daily Services">
              {allServices.map((s) => (
                <option key={s.id} value={`service:${s.id}`}>
                  {s.segment} · {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Open Daily Shifts">
              {allShifts.map((j) => (
                <option key={j.id} value={`shift:${j.id}`}>
                  {j.city.split('·')[0].trim()} · {j.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Main 12-Col Live Route & Work Inspector Workspace */}
      <div className="mt-7 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left 8 Cols: Live Arrival Status + Google Maps Route + Running Stage Stepper */}
        <div className="space-y-6 lg:col-span-8">
          {/* Zomato-Style Live Worker Arrival & Distance Banner */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.06em] text-[#059669] uppercase">
                Live Worker Arrival Status
              </p>
              <p className="font-display mt-1 text-lg font-extrabold text-[#18181b]">
                {buildZomatoArrivalMessage({
                  workerName: normalized.proLabel,
                  distanceKm: normalized.distanceKm,
                  etaMinutes: normalized.etaMinutes,
                  progress,
                  dispatchStatus:
                    target.type === 'booking' ? target.booking.dispatchStatus : 'Accepted',
                  stage: activeStageFromProgress,
                  status: target.type === 'booking' ? target.booking.status : 'Active',
                })}
              </p>
              <p className="mt-1 text-xs text-[#52525b]">
                Destination: {normalized.siteName}
                {target.type === 'booking' ? ` · OTP Ref: ${target.booking.escrowCode}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-5 border-t border-[#e4e4e7] pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5 shrink-0">
              <div>
                <p className="text-[11px] font-semibold text-[#71717a]">Distance</p>
                <p className="font-mono text-xl font-extrabold text-[#18181b] tabular-nums">
                  {formatLiveDistance(normalized.distanceKm, progress)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#71717a]">Est. Time</p>
                <p className="font-mono text-xl font-extrabold text-[#059669] tabular-nums">
                  {formatLiveEta(normalized.etaMinutes, progress)}
                </p>
              </div>
            </div>
          </div>

          <LiveDispatchMap
            hasApiKey={hasApiKey}
            workTitle={normalized.title}
            hubName={normalized.hubName}
            hubCoords={normalized.hubCoords}
            siteName={normalized.siteName}
            siteCoords={normalized.siteCoords}
            proLabel={normalized.proLabel}
            distanceKm={normalized.distanceKm}
            etaMinutes={normalized.etaMinutes}
            progress={progress}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            onResetRoute={() => {
              setProgress(0.08);
              setIsPlaying(true);
            }}
          />

          {/* Interactive 4-Step Live Line Running Stepper */}
          <div className="rounded-2xl border border-[#e4e4e7] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[#18181b]">
                Live Work Route Timeline (Click any stage to jump route position)
              </h2>
              <span className="font-mono text-xs font-semibold text-[#e23744] tabular-nums">
                Stage {activeStageFromProgress + 1} of 4
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {DISPATCH_STAGES.map((step) => {
                const reached = activeStageFromProgress >= step.stage;
                const current = activeStageFromProgress === step.stage;
                return (
                  <button
                    key={step.stage}
                    type="button"
                    onClick={() => {
                      setProgress(step.progressTarget);
                      setIsPlaying(step.stage < 3);
                    }}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      current
                        ? 'border-[#e23744] bg-[#fff1f2]/60'
                        : reached
                        ? 'border-[#a7f3d0] bg-[#ecfdf5]/50'
                        : 'border-[#e4e4e7] bg-white hover:bg-[#f4f4f5]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                          reached
                            ? step.stage === 3
                              ? 'bg-[#059669] text-white'
                              : 'bg-[#e23744] text-white'
                            : 'bg-[#f4f4f5] text-[#71717a]'
                        }`}
                      >
                        {reached ? <Check className="h-3.5 w-3.5" /> : step.stage + 1}
                      </span>
                      <span className="text-xs font-bold text-[#18181b]">
                        {step.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-[#52525b]">
                      {step.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zomato-Style Nearest Concerned Worker Dispatch Cascade */}
          <div className="rounded-2xl border border-[#e4e4e7] bg-white p-5">
            <div className="flex flex-col gap-3 border-b border-[#e4e4e7] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] text-[#059669] uppercase">
                  <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Nearest Concerned Worker Auto-Dispatch Queue</span>
                </p>
                <h2 className="font-display mt-1 text-base font-bold text-[#18181b]">
                  {activeCategoryForQueue} Pros Ranked Closest to Site ({normalized.cityLabel})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {target.type === 'booking' &&
                  target.booking.status === 'Active' &&
                  target.booking.dispatchStatus === 'Pinging Nearest' &&
                  target.booking.stage === 0 && (
                    <>
                      <span className="font-mono text-xs font-bold text-[#d97706] tabular-nums">
                        Pinging #1 in {pingSecondsLeft}s...
                      </span>
                      {onAcceptDispatch && (
                        <button
                          type="button"
                          onClick={() => onAcceptDispatch(target.booking.id)}
                          className="min-h-[34px] rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#047857] cursor-pointer"
                        >
                          Accept Now
                        </button>
                      )}
                    </>
                  )}

                {target.type === 'booking' &&
                  target.booking.status === 'Active' &&
                  target.booking.stage < 2 &&
                  nextFallbackCandidate &&
                  onReassignWorker && (
                    <button
                      type="button"
                      onClick={() =>
                        onReassignWorker(target.booking.id, nextFallbackCandidate)
                      }
                      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-1.5 text-xs font-semibold text-[#be123c] hover:bg-[#ffe4e6] cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        If Busy → Route to #{nextFallbackCandidate.rank} ({nextFallbackCandidate.pro.name})
                      </span>
                    </button>
                  )}
              </div>
            </div>

            <div className="mt-3 divide-y divide-[#e4e4e7]">
              {rankedCandidates.map((candidate) => {
                const isAssigned =
                  target.type === 'booking'
                    ? target.booking.assignedWorkerId === candidate.pro.id
                    : candidate.rank === 1;
                const isPinging =
                  isAssigned &&
                  target.type === 'booking' &&
                  target.booking.dispatchStatus === 'Pinging Nearest' &&
                  target.booking.stage === 0;
                const canRouteHere =
                  target.type === 'booking' &&
                  target.booking.status === 'Active' &&
                  target.booking.stage < 2 &&
                  !isAssigned &&
                  Boolean(onReassignWorker);

                return (
                  <div
                    key={candidate.pro.id}
                    className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      isAssigned ? 'bg-[#ecfdf5]/50 -mx-2 px-2 rounded-xl' : ''
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-extrabold shrink-0 ${
                          isAssigned
                            ? 'bg-[#059669] text-white'
                            : 'bg-[#f4f4f5] text-[#52525b]'
                        }`}
                      >
                        #{candidate.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#18181b] truncate">
                          {candidate.pro.name}{' '}
                          <span className="text-xs font-medium text-[#71717a]">
                            · {candidate.pro.specialtyTitle}
                          </span>
                        </p>
                        <p className="text-xs text-[#52525b]">
                          {candidate.pro.locality} · {candidate.pro.rating.toFixed(2)}★ ·{' '}
                          {candidate.pro.onTimeRate}% on-time
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-xs font-bold text-[#18181b] tabular-nums">
                          {candidate.distanceKm.toFixed(1)} km · {candidate.etaMinutes} min ETA
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${
                            isPinging
                              ? 'text-[#d97706]'
                              : isAssigned
                              ? 'text-[#059669]'
                              : 'text-[#71717a]'
                          }`}
                        >
                          {isPinging
                            ? 'Pinging Nearest Worker...'
                            : isAssigned
                            ? target.type === 'booking'
                              ? 'Assigned & Live Route Active'
                              : 'Closest Priority Match'
                            : 'Standby Backup'}
                        </p>
                      </div>

                      {canRouteHere && onReassignWorker && target.type === 'booking' && (
                        <button
                          type="button"
                          onClick={() =>
                            onReassignWorker(target.booking.id, candidate)
                          }
                          className="min-h-[32px] rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
                        >
                          Route Here
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Work Brief, Daily Worker Demand & Direct Dispatch CTA */}
        <aside className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white lg:sticky lg:top-24 lg:col-span-4">
          {normalized.imageUrl && (
            <div className="aspect-[16/9] w-full overflow-hidden bg-[#f4f4f5]">
              <ResilientImage
                src={normalized.imageUrl}
                alt={normalized.imageAlt}
                className="h-full w-full"
                fallbackLabel={normalized.category}
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-[#e23744]">
                {normalized.segment} · {normalized.category}
              </span>
              <span className="font-mono text-[#71717a]">{normalized.cityLabel}</span>
            </div>

            <h2 className="font-display mt-2 text-lg font-extrabold leading-snug text-[#18181b]">
              {normalized.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#52525b]">
              {normalized.subtitle}
            </p>

            <div className="mt-4 space-y-2 border-y border-[#e4e4e7] py-4 text-xs text-[#52525b]">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 text-[#e23744] shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-[#18181b]">Origin:</strong> {normalized.hubName}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 text-[#059669] shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-[#18181b]">Site:</strong> {normalized.siteName}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Users className="mt-0.5 h-3.5 w-3.5 text-[#d97706] shrink-0" aria-hidden="true" />
                <span className="tabular-nums">
                  <strong className="text-[#18181b]">Today&apos;s Zone Demand:</strong>{' '}
                  {normalized.workersActiveToday}/{normalized.workersNeededToday} workers deployed (
                  {openGap} needed today)
                </span>
              </p>
            </div>

            <ul className="mt-4 space-y-1.5 text-xs text-[#52525b]">
              {normalized.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-[#059669] shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between border-t border-[#e4e4e7] pt-4">
              <div>
                <p className="text-xs font-medium text-[#71717a]">{normalized.priceLabel}</p>
                <p className="font-mono text-2xl font-extrabold text-[#18181b] tabular-nums">
                  {normalized.priceValue}
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-[#059669]">
                Escrow Protected
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {target.type === 'service' && (
                <button
                  type="button"
                  onClick={() => onBookService(target.service)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#e23744] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#be123c] cursor-pointer"
                >
                  <span>
                    {target.service.allowsHeadcount
                      ? 'Order Crew & Lock Route'
                      : 'Order Now & Track Live'}
                  </span>
                </button>
              )}

              {target.type === 'shift' && (
                <button
                  type="button"
                  onClick={() => onClaimShift(target.shift)}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                    isShiftClaimed
                      ? 'border border-[#059669] bg-[#ecfdf5] text-[#047857]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isShiftClaimed
                      ? 'Shift Claimed · Open Bookings'
                      : `Claim Shift · ${normalized.priceValue}`}
                  </span>
                </button>
              )}

              {target.type === 'booking' &&
                target.booking.status === 'Active' &&
                target.booking.stage < 3 && (
                  <button
                    type="button"
                    onClick={() => onAdvanceStage(target.booking.id)}
                    className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-colors cursor-pointer ${
                      target.booking.kind === 'claimed_shift'
                        ? 'bg-[#059669] hover:bg-[#047857]'
                        : 'bg-[#e23744] hover:bg-[#be123c]'
                    }`}
                  >
                    <span>
                      {target.booking.stage === 2
                        ? 'Verify OTP & Release Escrow'
                        : 'Advance Live Dispatch Stage'}
                    </span>
                  </button>
                )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
