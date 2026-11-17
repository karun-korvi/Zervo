import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Navigation,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { B2B_INDUSTRIES, WORK_FORMATS, ZEVRO_CITIES } from '../data/zevroData';
import {
  B2BIndustry,
  BusinessSegment,
  DailyDemandMetric,
  JobShift,
  LiveWorkTarget,
  ScreenId,
  ServiceCategory,
  ShiftBucket,
  WorkFormat,
} from '../types/zevro';
import { DailyDemandTracker } from './DailyDemandTracker';
import { MarketGroundingPanel } from './MarketGroundingPanel';
import { ResilientImage } from './ResilientImage';
import { PricePreset, SearchFilterBar } from './SearchFilterBar';

interface JobsExchangeViewProps {
  hasApiKey: boolean;
  shifts: JobShift[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  claimedShiftIds: string[];
  onClaimShift: (shift: JobShift) => void;
  onOpenLiveWork: (target: LiveWorkTarget) => void;
  onOpenDemandWork: (metric: DailyDemandMetric) => void;
  onNavigate: (screen: ScreenId) => void;
}

const JOB_PAYOUT_PRESETS: PricePreset[] = [
  { id: 'all', label: 'All', min: '', max: '' },
  { id: 'under-850', label: 'Under ₹850', min: '', max: '850' },
  { id: '850-1200', label: '₹850–₹1,200', min: '850', max: '1200' },
  { id: '1200-plus', label: '₹1,200+', min: '1200', max: '' },
];

const DAY_FILTERS = ['All Days', 'Today', 'Tomorrow', 'Tue, Nov 17'] as const;
const SHIFT_WINDOWS: ('All Shifts' | ShiftBucket)[] = [
  'All Shifts',
  'Morning',
  'Afternoon',
  'Evening',
  'Night',
];
const WORK_FORMAT_FILTERS: ('All Formats' | WorkFormat)[] = [
  'All Formats',
  ...WORK_FORMATS,
];

export const JobsExchangeView: React.FC<JobsExchangeViewProps> = ({
  hasApiKey,
  shifts,
  selectedCity,
  onCityChange,
  claimedShiftIds,
  onClaimShift,
  onOpenLiveWork,
  onOpenDemandWork,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<ServiceCategory>('All');
  const [segmentFilter, setSegmentFilter] = useState<'All' | BusinessSegment>('All');
  const [industryFilter, setIndustryFilter] = useState<'All' | B2BIndustry>('All');
  const [workFormatFilter, setWorkFormatFilter] = useState<'All Formats' | WorkFormat>('All Formats');
  const [dayFilter, setDayFilter] = useState<(typeof DAY_FILTERS)[number]>('All Days');
  const [bucketFilter, setBucketFilter] = useState<'All Shifts' | ShiftBucket>('All Shifts');
  const [minPayout, setMinPayout] = useState('');
  const [maxPayout, setMaxPayout] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [allCities, setAllCities] = useState(true);
  const [sortBy, setSortBy] = useState<'payout' | 'distance'>('payout');
  const [activeShiftId, setActiveShiftId] = useState<string>(shifts[0]?.id ?? '');

  const parsedMin = minPayout !== '' ? Number(minPayout) : null;
  const parsedMax = maxPayout !== '' ? Number(maxPayout) : null;

  const filteredShifts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shifts
      .filter((shift) => {
        const matchesSegment =
          segmentFilter === 'All' || shift.segment === segmentFilter;
        const matchesTrade = tradeFilter === 'All' || shift.trade === tradeFilter;
        const matchesIndustry =
          industryFilter === 'All' || shift.industry === industryFilter;
        const matchesFormat =
          workFormatFilter === 'All Formats' || shift.workFormat === workFormatFilter;
        const matchesDay = dayFilter === 'All Days' || shift.shiftDate === dayFilter;
        const matchesBucket =
          bucketFilter === 'All Shifts' || shift.shiftBucket === bucketFilter;
        const matchesUrgency = !urgentOnly || shift.urgency === 'Urgent Fill';
        const matchesCity = allCities || shift.city === selectedCity;
        const matchesMin =
          parsedMin === null || Number.isNaN(parsedMin) || shift.totalPayout >= parsedMin;
        const matchesMax =
          parsedMax === null || Number.isNaN(parsedMax) || shift.totalPayout <= parsedMax;
        const matchesQuery =
          !q ||
          shift.title.toLowerCase().includes(q) ||
          shift.employer.toLowerCase().includes(q) ||
          shift.locality.toLowerCase().includes(q) ||
          shift.trade.toLowerCase().includes(q) ||
          shift.workFormat.toLowerCase().includes(q) ||
          (shift.industry?.toLowerCase().includes(q) ?? false) ||
          shift.brief.toLowerCase().includes(q);
        return (
          matchesSegment &&
          matchesTrade &&
          matchesIndustry &&
          matchesFormat &&
          matchesDay &&
          matchesBucket &&
          matchesUrgency &&
          matchesCity &&
          matchesMin &&
          matchesMax &&
          matchesQuery
        );
      })
      .sort((a, b) =>
        sortBy === 'payout'
          ? b.totalPayout - a.totalPayout
          : a.distanceKm - b.distanceKm
      );
  }, [
    shifts,
    searchQuery,
    segmentFilter,
    tradeFilter,
    industryFilter,
    workFormatFilter,
    dayFilter,
    bucketFilter,
    urgentOnly,
    allCities,
    selectedCity,
    parsedMin,
    parsedMax,
    sortBy,
  ]);

  const selectedShift =
    filteredShifts.find((s) => s.id === activeShiftId) ?? filteredShifts[0] ?? null;

  const isSelectedClaimed = selectedShift
    ? claimedShiftIds.includes(selectedShift.id)
    : false;

  const handleResetFilters = () => {
    setSearchQuery('');
    setTradeFilter('All');
    setSegmentFilter('All');
    setIndustryFilter('All');
    setWorkFormatFilter('All Formats');
    setDayFilter('All Days');
    setBucketFilter('All Shifts');
    setMinPayout('');
    setMaxPayout('');
    setUrgentOnly(false);
    setAllCities(true);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.06em] text-[#059669] uppercase">
            ZEVRO Daily Work · Find Work / Hire Workers
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-[#18181b]">
            12 Job Types Across Every Skill &amp; Industry
          </h1>
          <p className="mt-1 text-sm text-[#52525b]">
            Filter daily, part-time, full-time, temporary, weekend, night shift, contract, project, skilled, entry-level, remote, and freelance jobs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="jobs-city-select" className="sr-only">
            Filter city
          </label>
          <select
            id="jobs-city-select"
            value={allCities ? 'ALL' : selectedCity}
            onChange={(e) => {
              if (e.target.value === 'ALL') {
                setAllCities(true);
              } else {
                setAllCities(false);
                onCityChange(e.target.value);
              }
            }}
            className="min-h-[40px] rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Metro Hubs</option>
            {ZEVRO_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <label htmlFor="jobs-sort-select" className="sr-only">
            Sort jobs
          </label>
          <select
            id="jobs-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'payout' | 'distance')}
            className="min-h-[40px] rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
          >
            <option value="payout">Sort: Highest Payout</option>
            <option value="distance">Sort: Closest Distance</option>
          </select>

          <button
            type="button"
            onClick={() => setUrgentOnly((prev) => !prev)}
            className={`min-h-[40px] rounded-lg border-[1.5px] px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              urgentOnly
                ? 'border-[#d97706] bg-[#fffbeb] text-[#92400e]'
                : 'border-[#e4e4e7] bg-white text-[#52525b] hover:bg-[#f4f4f5]'
            }`}
          >
            Urgent Surge Only
          </button>
        </div>
      </div>

      {/* Day-to-Day, Shift-Wise & Flexible Format Selector Bar */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#e4e4e7] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18181b] mr-1">
              <CalendarDays className="h-4 w-4 text-[#059669]" aria-hidden="true" />
              Day:
            </span>
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#f4f4f5] p-1">
              {DAY_FILTERS.map((day) => {
                const active = dayFilter === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setDayFilter(day)}
                    className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-[#047857] shadow-xs'
                        : 'text-[#52525b] hover:text-[#18181b]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18181b] mr-1">
              <Clock className="h-4 w-4 text-[#059669]" aria-hidden="true" />
              Shift:
            </span>
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#f4f4f5] p-1">
              {SHIFT_WINDOWS.map((bucket) => {
                const active = bucketFilter === bucket;
                return (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => setBucketFilter(bucket)}
                    className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-[#047857] shadow-xs'
                        : 'text-[#52525b] hover:text-[#18181b]'
                    }`}
                  >
                    {bucket}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e4e7] pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#18181b] mr-1">
              Job Type (12):
            </span>
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#f4f4f5] p-1">
              {WORK_FORMAT_FILTERS.map((fmt) => {
                const active = workFormatFilter === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setWorkFormatFilter(fmt)}
                    className={`min-h-[30px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-[#047857] shadow-xs'
                        : 'text-[#52525b] hover:text-[#18181b]'
                    }`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Search & Price Range Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search roadside mechanic, hospital, warehouse, event crew, locality..."
        selectedCategory={tradeFilter}
        onCategoryChange={setTradeFilter}
        segmentFilter={segmentFilter}
        onSegmentChange={setSegmentFilter}
        minPrice={minPayout}
        maxPrice={maxPayout}
        onMinPriceChange={setMinPayout}
        onMaxPriceChange={setMaxPayout}
        priceLabel="Payout Range (₹)"
        pricePresets={JOB_PAYOUT_PRESETS}
        resultCount={filteredShifts.length}
        totalCount={shifts.length}
        itemNoun="shifts"
        onResetAll={handleResetFilters}
        accentTone="emerald"
        extraControls={
          <div className="flex-1 lg:flex-none">
            <label
              htmlFor="jobs-industry-select"
              className="block text-xs font-semibold text-[#52525b]"
            >
              B2B Sector
            </label>
            <select
              id="jobs-industry-select"
              value={industryFilter}
              onChange={(e) =>
                setIndustryFilter(e.target.value as 'All' | B2BIndustry)
              }
              className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
            >
              <option value="All">All Sectors</option>
              {B2B_INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Master-Detail Shift Exchange Workspace */}
      {filteredShifts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#e4e4e7] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#18181b]">
            No shifts match these day or payout filters
          </p>
          <p className="mt-1 text-sm text-[#52525b]">
            Try switching day, shift window, or widening your payout range.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-[#059669] px-5 py-2 text-sm font-semibold text-white hover:bg-[#047857] cursor-pointer"
          >
            Reset Shift Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Column: Shift List with Respective Trade Thumbnails */}
          <div className="space-y-4 lg:col-span-7">
            {filteredShifts.map((shift) => {
              const isSelected = selectedShift?.id === shift.id;
              const isClaimed = claimedShiftIds.includes(shift.id);
              const hourlyRate = Math.round(shift.totalPayout / shift.durationHours);

              return (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => setActiveShiftId(shift.id)}
                  className={`flex w-full flex-col gap-4 rounded-2xl border bg-white p-4 text-left transition-all sm:flex-row sm:items-center cursor-pointer ${
                    isSelected
                      ? 'border-[#059669] ring-2 ring-[#059669]/15'
                      : 'border-[#e4e4e7] hover:border-[#d4d4d8]'
                  }`}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#f4f4f5] sm:w-36 shrink-0">
                    <ResilientImage
                      src={shift.imageUrl}
                      alt={shift.imageAlt}
                      className="h-full w-full"
                      fallbackLabel={shift.trade}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span className="text-[#71717a]">
                        <span className="text-[#e23744]">{shift.segment}</span>
                        {shift.industry ? ` · ${shift.industry}` : ''}
                        {' · '}
                        {shift.workFormat} · {shift.trade} · {shift.city} · {shift.distanceKm} km
                      </span>
                      <div className="flex items-center gap-3">
                        {shift.urgency === 'Urgent Fill' && (
                          <span className="inline-flex items-center gap-1 text-[#d97706]">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Urgent +₹{shift.surgeBonus}
                          </span>
                        )}
                        {isClaimed && (
                          <span className="inline-flex items-center gap-1 text-[#059669]">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Claimed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-bold text-[#18181b]">
                          {shift.title}
                        </h2>
                        <p className="mt-0.5 text-xs text-[#52525b]">
                          {shift.employer} · {shift.locality}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono text-lg font-extrabold text-[#059669] tabular-nums">
                          ₹{shift.totalPayout.toLocaleString('en-IN')}
                        </p>
                        <p className="font-mono text-xs text-[#71717a] tabular-nums">
                          ₹{hourlyRate}/hr
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#e4e4e7] pt-2.5 text-xs text-[#52525b]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#71717a]" aria-hidden="true" />
                        {shift.shiftDate} · {shift.shiftBucket} ({shift.shiftWindow})
                      </span>
                      <span className="font-mono tabular-nums">
                        {shift.durationHours}h
                      </span>
                      <span className="font-mono tabular-nums">
                        {shift.slotsRemaining} slot{shift.slotsRemaining > 1 ? 's' : ''} open
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Sticky Shift Brief & Guaranteed Payout Inspector */}
          {selectedShift && (
            <aside className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white lg:sticky lg:top-24 lg:col-span-5">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#f4f4f5]">
                <ResilientImage
                  src={selectedShift.imageUrl}
                  alt={selectedShift.imageAlt}
                  className="h-full w-full"
                  fallbackLabel={selectedShift.trade}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#18181b]/85 via-[#18181b]/20 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-semibold text-[#a7f3d0]">
                    {selectedShift.segment}
                    {selectedShift.industry ? ` · ${selectedShift.industry}` : ''}
                    {' · '}
                    {selectedShift.workFormat} · {selectedShift.shiftDate} ({selectedShift.shiftBucket})
                  </p>
                  <h3 className="font-display mt-1 text-lg font-bold leading-snug">
                    {selectedShift.title}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col gap-1.5 border-b border-[#e4e4e7] pb-4 text-xs font-medium text-[#52525b]">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#e23744] shrink-0" aria-hidden="true" />
                    <span>
                      {selectedShift.locality}, {selectedShift.city} ({selectedShift.distanceKm} km · {selectedShift.etaMinutes} min)
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 tabular-nums">
                    <Users className="h-3.5 w-3.5 text-[#d97706] shrink-0" aria-hidden="true" />
                    <span>
                      Daily Zone Demand: {selectedShift.workersAssignedToday}/{selectedShift.workersNeededToday} filled ({Math.max(0, selectedShift.workersNeededToday - selectedShift.workersAssignedToday)} needed today)
                    </span>
                  </p>
                </div>

                <div className="py-5">
                  <h4 className="text-xs font-bold tracking-[0.04em] text-[#71717a] uppercase">
                    Guaranteed Payout Breakdown
                  </h4>
                  <dl className="mt-3 divide-y divide-[#e4e4e7] text-sm">
                    <div className="flex items-center justify-between py-2">
                      <dt className="text-[#52525b]">
                        Base Block Rate ({selectedShift.durationHours}h)
                      </dt>
                      <dd className="font-mono font-semibold text-[#18181b] tabular-nums">
                        ₹{selectedShift.basePay.toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <dt className="text-[#52525b]">Peak / Urgent Surge Bonus</dt>
                      <dd className="font-mono font-semibold text-[#d97706] tabular-nums">
                        +₹{selectedShift.surgeBonus.toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="font-bold text-[#18181b]">Total Escrow Payout</dt>
                      <dd className="font-mono text-lg font-extrabold text-[#059669] tabular-nums">
                        ₹{selectedShift.totalPayout.toLocaleString('en-IN')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t border-[#e4e4e7] py-4">
                  <h4 className="text-xs font-bold tracking-[0.04em] text-[#71717a] uppercase">
                    Operational Brief
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#52525b]">
                    {selectedShift.brief}
                  </p>
                </div>

                <div className="border-t border-[#e4e4e7] py-4">
                  <h4 className="text-xs font-bold tracking-[0.04em] text-[#71717a] uppercase">
                    Credentials &amp; Gear Required
                  </h4>
                  <ul className="mt-2.5 space-y-1.5 text-xs font-medium text-[#18181b]">
                    {selectedShift.credentialsRequired.map((cred) => (
                      <li key={cred} className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#059669] shrink-0" aria-hidden="true" />
                        <span>{cred}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenLiveWork({ type: 'shift', shift: selectedShift })}
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-5 py-2 text-sm font-semibold text-[#18181b] transition-colors hover:bg-[#f4f4f5] cursor-pointer"
                  >
                    <Navigation className="h-4 w-4 text-[#059669]" aria-hidden="true" />
                    <span>Open Live Route Line</span>
                  </button>

                  {isSelectedClaimed ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('bookings')}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#059669] bg-[#ecfdf5] px-5 py-2.5 text-sm font-semibold text-[#047857] cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>Shift Claimed · Open Schedule</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onClaimShift(selectedShift)}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#059669] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#047857] active:scale-[0.98] cursor-pointer"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>
                        Claim Shift · ₹{selectedShift.totalPayout.toLocaleString('en-IN')}
                      </span>
                    </button>
                  )}
                  <p className="text-center text-xs text-[#71717a]">
                    Funds are pre-locked in ZEVRO Escrow and released on OTP sign-off.
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Daily High-Demand Jobs & Zone Worker Requirement Map */}
      <DailyDemandTracker
        hasApiKey={hasApiKey}
        mode="pro"
        selectedCity={selectedCity}
        allCities={allCities}
        onOpenDemandWork={onOpenDemandWork}
      />

      {/* Live Indian Market Wage Verification & Nearby Hubs */}
      <MarketGroundingPanel
        selectedCity={selectedCity}
        defaultQuery="Daily picker packer, security guard & delivery shift wage"
      />
    </div>
  );
};
