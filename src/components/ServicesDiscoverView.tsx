import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Layers,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Wallet,
  X,
} from 'lucide-react';
import {
  CATEGORY_BLUEPRINT,
  HERO_DISPATCH_IMAGE,
  ZEVRO_CITIES,
} from '../data/zevroData';
import {
  BusinessRequirement,
  BusinessSegment,
  DailyDemandMetric,
  JobShift,
  LiveWorkTarget,
  OrderCartItem,
  ProfessionalCategory,
  ScreenId,
  ServiceCategory,
  ServiceOffering,
  VerificationQueueItem,
  WorkspaceMode,
} from '../types/zevro';
import { BusinessDashboardView } from './BusinessDashboardView';
import { DailyDemandTracker } from './DailyDemandTracker';
import { MarketGroundingPanel } from './MarketGroundingPanel';
import { ResilientImage } from './ResilientImage';
import { PricePreset, SearchFilterBar } from './SearchFilterBar';

interface ServicesDiscoverViewProps {
  hasApiKey: boolean;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  services: ServiceOffering[];
  shifts: JobShift[];
  claimedShiftIds: string[];
  cartItems: OrderCartItem[];
  onAddToCart: (service: ServiceOffering) => void;
  onUpdateCartQty: (serviceId: string, delta: number) => void;
  onOpenCartDrawer: () => void;
  onBookService: (service: ServiceOffering) => void;
  onClaimShift: (shift: JobShift) => void;
  onOpenLiveWork: (target: LiveWorkTarget) => void;
  onOpenDemandWork: (metric: DailyDemandMetric) => void;
  onNavigate: (screen: ScreenId, opts?: { category?: ServiceCategory; proCategory?: ProfessionalCategory }) => void;
  externalCategoryFilter?: ServiceCategory;
  businessRequirements: BusinessRequirement[];
  verificationQueue: VerificationQueueItem[];
  onCreateBusinessRequirement: (req: BusinessRequirement, linkedShift: JobShift) => void;
  onCheckInWorkers: (reqId: string, delta: number) => void;
  onResolveVerification: (verId: string, nextStatus: 'Approved' | 'Flagged') => void;
}

const SERVICE_PRICE_PRESETS: PricePreset[] = [
  { id: 'all', label: 'All', min: '', max: '' },
  { id: 'under-500', label: 'Under ₹500', min: '', max: '500' },
  { id: '500-900', label: '₹500–₹900', min: '500', max: '900' },
  { id: '900-plus', label: '₹900+', min: '900', max: '' },
];

const SHIFT_PRICE_PRESETS: PricePreset[] = [
  { id: 'all', label: 'All', min: '', max: '' },
  { id: 'under-850', label: 'Under ₹850', min: '', max: '850' },
  { id: '850-1200', label: '₹850–₹1,200', min: '850', max: '1200' },
  { id: '1200-plus', label: '₹1,200+', min: '1200', max: '' },
];

const QUICK_MENU_PILLS: { label: string; category: ServiceCategory }[] = [
  { label: 'All 15 Categories', category: 'All' },
  { label: 'Healthcare & Medical', category: 'Healthcare & Medical' },
  { label: 'Education & Tutoring', category: 'Education & Tutoring' },
  { label: 'Home Services', category: 'Home Services' },
  { label: 'Vehicle & Roadside', category: 'Vehicle & Transportation' },
  { label: 'Food & Cooking', category: 'Food & Cooking' },
  { label: 'Cleaning & Housekeeping', category: 'Cleaning & Housekeeping' },
  { label: 'Logistics & Warehouse', category: 'Logistics & Warehouse' },
  { label: 'IT & Professional', category: 'IT & Digital Services' },
  { label: 'Pet Care', category: 'Pet Care' },
];

export const ServicesDiscoverView: React.FC<ServicesDiscoverViewProps> = ({
  hasApiKey,
  mode,
  onModeChange,
  selectedCity,
  onCityChange,
  services,
  shifts,
  claimedShiftIds,
  cartItems,
  onAddToCart,
  onUpdateCartQty,
  onOpenCartDrawer,
  onBookService,
  onClaimShift,
  onOpenLiveWork,
  onOpenDemandWork,
  onNavigate,
  externalCategoryFilter,
  businessRequirements,
  verificationQueue,
  onCreateBusinessRequirement,
  onCheckInWorkers,
  onResolveVerification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('All');
  const [segmentFilter, setSegmentFilter] = useState<'All' | BusinessSegment>('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [allCitiesToggle, setAllCitiesToggle] = useState(true);
  const [directoryCategory, setDirectoryCategory] = useState<Exclude<ServiceCategory, 'All'> | null>(null);

  React.useEffect(() => {
    if (externalCategoryFilter) {
      setSelectedCategory(externalCategoryFilter);
    }
  }, [externalCategoryFilter]);

  const parsedMin = minPrice !== '' ? Number(minPrice) : null;
  const parsedMax = maxPrice !== '' ? Number(maxPrice) : null;

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((item) => {
      const matchesSegment =
        segmentFilter === 'All' || item.segment === segmentFilter;
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesCity =
        allCitiesToggle || item.cityAvailability.includes(selectedCity);
      const matchesMin =
        parsedMin === null || Number.isNaN(parsedMin) || item.flatPrice >= parsedMin;
      const matchesMax =
        parsedMax === null || Number.isNaN(parsedMax) || item.flatPrice <= parsedMax;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.segment.toLowerCase().includes(q);
      return (
        matchesSegment &&
        matchesCategory &&
        matchesCity &&
        matchesMin &&
        matchesMax &&
        matchesQuery
      );
    });
  }, [
    services,
    segmentFilter,
    selectedCategory,
    selectedCity,
    searchQuery,
    allCitiesToggle,
    parsedMin,
    parsedMax,
  ]);

  const filteredShifts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shifts.filter((item) => {
      const matchesSegment =
        segmentFilter === 'All' || item.segment === segmentFilter;
      const matchesCategory =
        selectedCategory === 'All' || item.trade === selectedCategory;
      const matchesCity = allCitiesToggle || item.city === selectedCity;
      const matchesMin =
        parsedMin === null || Number.isNaN(parsedMin) || item.totalPayout >= parsedMin;
      const matchesMax =
        parsedMax === null || Number.isNaN(parsedMax) || item.totalPayout <= parsedMax;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.employer.toLowerCase().includes(q) ||
        item.locality.toLowerCase().includes(q) ||
        item.trade.toLowerCase().includes(q);
      return (
        matchesSegment &&
        matchesCategory &&
        matchesCity &&
        matchesMin &&
        matchesMax &&
        matchesQuery
      );
    });
  }, [
    shifts,
    segmentFilter,
    selectedCategory,
    selectedCity,
    searchQuery,
    allCitiesToggle,
    parsedMin,
    parsedMax,
  ]);

  const activeCatalogRef = React.useRef<HTMLDivElement>(null);

  const scrollToCatalog = () => {
    activeCatalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSegmentFilter('All');
    setMinPrice('');
    setMaxPrice('');
    setAllCitiesToggle(true);
  };

  const cartQtyById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.service.id] = item.quantity;
    }
    return map;
  }, [cartItems]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.service.flatPrice * item.quantity, 0),
    [cartItems]
  );

  const isConsumer = mode === 'consumer';
  const isPro = mode === 'pro';
  const isBusiness = mode === 'business';

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Workspace Toolbar: 3-Mode Segmented Switch + Omnibar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="ZEVRO Exchange Mode"
          className="inline-flex w-fit flex-wrap items-center rounded-full bg-[#f4f4f5] p-1 border border-[#e4e4e7]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isConsumer}
            onClick={() => {
              onModeChange('consumer');
              setMinPrice('');
              setMaxPrice('');
            }}
            className={`min-h-[40px] rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isConsumer
                ? 'bg-white text-[#e23744] shadow-[0_2px_4px_rgba(24,24,27,0.08)]'
                : 'text-[#52525b] hover:text-[#18181b]'
            }`}
          >
            ZEVRO Services
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isPro}
            onClick={() => {
              onModeChange('pro');
              setMinPrice('');
              setMaxPrice('');
            }}
            className={`min-h-[40px] rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isPro
                ? 'bg-white text-[#059669] shadow-[0_2px_4px_rgba(24,24,27,0.08)]'
                : 'text-[#52525b] hover:text-[#18181b]'
            }`}
          >
            ZEVRO Earn (Jobs)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isBusiness}
            onClick={() => {
              onModeChange('business');
              setMinPrice('');
              setMaxPrice('');
            }}
            className={`min-h-[40px] rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isBusiness
                ? 'bg-white text-[#18181b] shadow-[0_2px_4px_rgba(24,24,27,0.08)]'
                : 'text-[#52525b] hover:text-[#18181b]'
            }`}
          >
            ZEVRO Workforce (B2B)
          </button>
        </div>

        {/* Search & Location Omnibar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            scrollToCatalog();
          }}
          className={`flex w-full max-w-2xl items-center rounded-full border border-[#d4d4d8] bg-white p-1.5 shadow-[0_1px_3px_rgba(24,24,27,0.05)] ${
            isConsumer
              ? 'focus-within:border-[#e23744] focus-within:ring-3 focus-within:ring-[#e23744]/15'
              : 'focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15'
          }`}
        >
          <div className="flex items-center gap-2 pl-3 pr-2 shrink-0">
            <MapPin
              className={`h-4 w-4 shrink-0 ${
                isConsumer ? 'text-[#e23744]' : 'text-[#059669]'
              }`}
              aria-hidden="true"
            />
            <label htmlFor="omnibar-city" className="sr-only">
              Select Service City
            </label>
            <select
              id="omnibar-city"
              value={allCitiesToggle ? 'ALL' : selectedCity}
              onChange={(e) => {
                if (e.target.value === 'ALL') {
                  setAllCitiesToggle(true);
                } else {
                  setAllCitiesToggle(false);
                  onCityChange(e.target.value);
                }
              }}
              className="max-w-[165px] truncate bg-transparent text-xs font-semibold text-[#18181b] focus:outline-none cursor-pointer sm:max-w-none sm:text-sm"
            >
              <option value="ALL">All Metro Hubs</option>
              {ZEVRO_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <span className="mx-1 h-5 w-px bg-[#e4e4e7] shrink-0" aria-hidden="true" />

          <div className="relative flex flex-1 items-center px-2">
            <Search className="mr-2 h-4 w-4 text-[#71717a] shrink-0" aria-hidden="true" />
            <label htmlFor="omnibar-search" className="sr-only">
              Search services or shifts
            </label>
            <input
              id="omnibar-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isConsumer
                  ? 'Order picker packer, electrician, AC service, movers...'
                  : 'Claim dark store shift, HVAC block, delivery runner...'
              }
              className="w-full bg-transparent text-sm text-[#18181b] placeholder:text-[#71717a] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="ml-1 rounded-full p-1 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isConsumer
                ? 'bg-[#e23744] hover:bg-[#be123c]'
                : 'bg-[#059669] hover:bg-[#047857]'
            }`}
          >
            Search
          </button>
        </form>
      </div>

      {/* Business & Ops Hub View */}
      {isBusiness ? (
        <BusinessDashboardView
          selectedCity={selectedCity}
          businessRequirements={businessRequirements}
          verificationQueue={verificationQueue}
          onCreateRequirement={onCreateBusinessRequirement}
          onCheckInWorkers={onCheckInWorkers}
          onResolveVerification={onResolveVerification}
          onNavigate={onNavigate}
        />
      ) : (
        <>
          {/* Hero Split Section */}
          <section className="mt-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between lg:col-span-6 lg:py-3">
              <div>
                <p
                  className={`text-xs font-bold tracking-[0.06em] uppercase ${
                    isConsumer ? 'text-[#e23744]' : 'text-[#059669]'
                  }`}
                >
                  {isConsumer
                    ? 'ZEVRO · One Platform for Every Service. Every Skill. Every Opportunity.'
                    : 'ZEVRO Earn · 12 Flexible Work Formats · Escrow Guaranteed'}
                </p>
                <h1 className="font-display mt-3 text-balance text-[clamp(2.2rem,3.7vw,3.3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#18181b]">
                  {isConsumer
                    ? 'Every service, professional & daily skill in one marketplace.'
                    : 'Find work, claim verified shifts, and track your earnings.'}
                </h1>
                <p className="mt-5 max-w-[58ch] text-base leading-[1.65] text-[#52525b] sm:text-lg">
                  {isConsumer
                    ? 'Book doctors, tutors, swimming coaches, CAs, home technicians, roadside mechanics, cooks, cleaners, and B2B workforce crews across 15 unified B2C + B2B categories.'
                    : 'Discover daily, part-time, full-time, temporary, weekend, night, contract, remote, and freelance jobs across warehouses, hospitals, offices, and homes.'}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    isConsumer ? scrollToCatalog() : onNavigate('jobs')
                  }
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                    isConsumer
                      ? 'bg-[#e23744] hover:bg-[#be123c]'
                      : 'bg-[#059669] hover:bg-[#047857]'
                  }`}
                >
                  <span>
                    {isConsumer
                      ? 'Browse 15 Service Categories'
                      : 'Explore All 12 Job Types'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onNavigate('pros', { proCategory: 'Doctor' })
                  }
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-[1.5px] border-[#d4d4d8] bg-white px-4 py-3 text-sm font-semibold text-[#18181b] transition-colors hover:bg-[#f4f4f5] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Stethoscope className="h-4 w-4 text-[#e23744]" aria-hidden="true" />
                  <span>Book a Professional</span>
                </button>
              </div>
            </div>

            {/* Right Hero Focal Carrier */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white lg:col-span-6">
              <div className="relative aspect-[16/9] w-full overflow-hidden lg:flex-1">
                <ResilientImage
                  src={HERO_DISPATCH_IMAGE}
                  alt="ZEVRO uniformed service specialist arriving with diagnostic tablet and tool kit"
                  className="h-full w-full"
                  fallbackLabel="ZEVRO Field Dispatch"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#18181b]/88 via-[#18181b]/25 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 text-white">
                  <div>
                    <p className="text-xs font-semibold text-[#fecdd3]">
                      Bengaluru Launch Hub + Pan-India Metro Corridors
                    </p>
                    <p className="font-display mt-0.5 text-lg font-bold tracking-tight">
                      {allCitiesToggle ? 'Bengaluru · Mumbai · NCR · Hyderabad' : selectedCity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-[#34d399] tabular-nums">
                      {isConsumer ? '15 min vehicle · 90 min crew' : '₹750 – ₹1,800 / shift'}
                    </p>
                    <p className="text-xs text-[#e4e4e7]">
                      Escrow settled on OTP sign-off
                    </p>
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-3 divide-x divide-[#e4e4e7] border-t border-[#e4e4e7] bg-white px-2 py-3.5 text-xs">
                <div className="px-3">
                  <dt className="text-[#71717a]">Unified Taxonomy</dt>
                  <dd className="mt-0.5 font-mono font-bold text-[#18181b] tabular-nums">
                    15 Categories
                  </dd>
                </div>
                <div className="px-3">
                  <dt className="text-[#71717a]">Daily Work Formats</dt>
                  <dd className="mt-0.5 font-semibold text-[#18181b]">
                    12 Job Types
                  </dd>
                </div>
                <div className="px-3">
                  <dt className="text-[#71717a]">B2B Workforce</dt>
                  <dd className="mt-0.5 font-semibold text-[#059669]">
                    12 Industry Verticals
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* 3-Pillar Architecture + 15-Category Directory Strip */}
          <section
            aria-label="ZEVRO Three Pillars & 15 Categories"
            className="mt-10 rounded-2xl border border-[#e4e4e7] bg-white p-6"
          >
            <div className="flex flex-col gap-3 border-b border-[#e4e4e7] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.06em] text-[#e23744] uppercase">
                  Three Connected Pillars · B2C + B2B Ecosystem
                </p>
                <h2 className="font-display mt-1 text-xl font-extrabold text-[#18181b]">
                  01. ZEVRO Services · 02. ZEVRO Workforce · 03. ZEVRO Earn
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDirectoryCategory(
                    directoryCategory ? null : CATEGORY_BLUEPRINT[0].id
                  )
                }
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-[#fcfbfa] px-3.5 py-1.5 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-[#e23744]" aria-hidden="true" />
                <span>
                  {directoryCategory ? 'Hide 15-Category Matrix' : 'Inspect All 15 B2C + B2B Categories'}
                </span>
              </button>
            </div>

            {/* 15 Category Tiles (Click any category to filter catalog OR inspect B2C/B2B roles) */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              {CATEGORY_BLUEPRINT.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setDirectoryCategory(cat.id);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[#e23744] bg-[#fff1f2]'
                        : 'border-[#e4e4e7] bg-[#fcfbfa] hover:border-[#d4d4d8] hover:bg-white'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold text-[#71717a] tabular-nums">
                      {String(cat.number).padStart(2, '0')} · B2C &amp; B2B
                    </span>
                    <span className="mt-1 text-xs font-bold text-[#18181b] leading-snug">
                      {cat.id}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Interactive B2C + B2B Role Breakdown Panel for Selected Category */}
            {directoryCategory && (() => {
              const entry = CATEGORY_BLUEPRINT.find((c) => c.id === directoryCategory);
              if (!entry) return null;
              return (
                <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-5 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-[#059669] uppercase">
                      B2C Individual Services — {entry.id}
                    </p>
                    <ul className="mt-2.5 space-y-2 text-xs">
                      {entry.b2cRoles.map((role) => (
                        <li key={role.service} className="border-b border-[#e4e4e7] pb-2 last:border-none last:pb-0">
                          <span className="font-bold text-[#18181b]">{role.service}:</span>{' '}
                          <span className="text-[#52525b]">{role.professional}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#e23744] uppercase">
                        B2B Workforce Roles — {entry.id}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDirectoryCategory(null)}
                        aria-label="Close category matrix"
                        className="rounded p-1 text-[#71717a] hover:bg-[#e4e4e7] hover:text-[#18181b] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ul className="mt-2.5 space-y-2 text-xs">
                      {entry.b2bRoles.map((role) => (
                        <li key={role.jobRole} className="border-b border-[#e4e4e7] pb-2 last:border-none last:pb-0">
                          <span className="font-bold text-[#18181b]">{role.jobRole}:</span>{' '}
                          <span className="text-[#52525b]">{role.work}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Catalog Section: Zomato-Style Quick Menu + Search & Price Filter Bar */}
          <section ref={activeCatalogRef} className="mt-12 scroll-mt-24">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={`text-xs font-bold tracking-[0.06em] uppercase ${
                isConsumer ? 'text-[#e23744]' : 'text-[#059669]'
              }`}
            >
              {isConsumer ? 'Instant Service Menu' : 'Day-to-Day Shift Board'}
            </p>
            <h2 className="font-display mt-1 text-2xl font-extrabold tracking-[-0.02em] text-[#18181b]">
              {isConsumer
                ? 'Book Everyday B2C & B2B Services'
                : 'Open Day-to-Day Shifts — Morning, Afternoon, Evening & Night'}
            </h2>
            <p className="mt-1 text-sm text-[#52525b]">
              {isConsumer
                ? 'Tap + Add to build a multi-service order tray or Order Now for immediate dispatch.'
                : 'Pick verified shifts by date, work format, and guaranteed escrow payout.'}
            </p>
          </div>
          <p className="text-xs text-[#52525b]">
            {allCitiesToggle ? 'All metro hubs' : selectedCity}
            {' · '}
            <button
              type="button"
              onClick={() => setAllCitiesToggle((prev) => !prev)}
              className={`font-semibold underline-offset-4 hover:underline cursor-pointer ${
                isConsumer ? 'text-[#e23744]' : 'text-[#059669]'
              }`}
            >
              {allCitiesToggle ? `Filter to ${selectedCity}` : 'Show all cities'}
            </button>
          </p>
        </div>

        {/* Quick Category Shortcuts */}
        {isConsumer && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
            {QUICK_MENU_PILLS.map((pill) => {
              const isSelected = selectedCategory === pill.category;
              return (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(pill.category);
                    setSearchQuery('');
                  }}
                  className={`min-h-[36px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-[#e23744] bg-[#fff1f2] text-[#be123c]'
                      : 'border-[#e4e4e7] bg-white text-[#52525b] hover:border-[#d4d4d8] hover:text-[#18181b]'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        )}

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isConsumer
              ? 'Search picker packer, electrician, deep clean, movers...'
              : 'Search dark store, HVAC, plumber, merchandiser...'
          }
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          segmentFilter={segmentFilter}
          onSegmentChange={setSegmentFilter}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          priceLabel={isConsumer ? 'Price Range (₹)' : 'Payout Range (₹)'}
          pricePresets={isConsumer ? SERVICE_PRICE_PRESETS : SHIFT_PRICE_PRESETS}
          resultCount={isConsumer ? filteredServices.length : filteredShifts.length}
          totalCount={isConsumer ? services.length : shifts.length}
          itemNoun={isConsumer ? 'services' : 'shifts'}
          onResetAll={handleResetFilters}
          accentTone={isConsumer ? 'crimson' : 'emerald'}
        />

        {/* Consumer & Business Ordering Catalog */}
        {isConsumer && (
          <>
            {filteredServices.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-[#e4e4e7] bg-white p-10 text-center">
                <p className="text-base font-bold text-[#18181b]">
                  No services match your current filters
                </p>
                <p className="mt-1 text-sm text-[#52525b]">
                  Try widening your price range, clearing the keyword, or switching category.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-[#e23744] px-5 py-2 text-sm font-semibold text-white hover:bg-[#be123c] cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map((service) => {
                  const qtyInCart = cartQtyById[service.id] ?? 0;
                  return (
                    <article
                      key={service.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow hover:shadow-[0_12px_24px_-8px_rgba(24,24,27,0.08)]"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenLiveWork({ type: 'service', service })}
                          className="block w-full text-left cursor-pointer"
                          aria-label={`Track live route for ${service.title}`}
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f4f4f5]">
                            <ResilientImage
                              src={service.imageUrl}
                              alt={service.imageAlt}
                              className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                              fallbackLabel={service.category}
                            />
                          </div>
                        </button>

                        <div className="p-6 pb-4">
                          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#71717a]">
                            <span>
                              <span
                                className={
                                  service.segment === 'B2B'
                                    ? 'text-[#e23744]'
                                    : 'text-[#059669]'
                                }
                              >
                                {service.segment}
                              </span>
                              {service.industry ? ` · ${service.industry}` : ''}
                              {' · '}
                              {service.category} · {service.arrivalEta}
                            </span>
                            <span className="font-mono text-[#18181b] tabular-nums">
                              {service.rating.toFixed(2)} ★
                            </span>
                          </div>

                          <h3 className="font-display mt-2 text-lg font-bold leading-snug text-[#18181b]">
                            <button
                              type="button"
                              onClick={() => onOpenLiveWork({ type: 'service', service })}
                              className="text-left hover:text-[#e23744] cursor-pointer"
                            >
                              {service.title}
                            </button>
                          </h3>

                          <p className="mt-2 text-sm leading-relaxed text-[#52525b]">
                            {service.summary}
                          </p>

                          <ul className="mt-4 space-y-1.5 border-t border-[#e4e4e7] pt-4 text-xs text-[#52525b]">
                            {service.inclusions.map((inc) => (
                              <li key={inc} className="flex items-start gap-2">
                                <Check
                                  className="mt-0.5 h-3.5 w-3.5 text-[#059669] shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-[#e4e4e7] px-6 py-4">
                        <div>
                          <p className="text-xs font-medium text-[#71717a]">
                            {service.unitLabel}
                          </p>
                          <p className="font-mono text-xl font-extrabold text-[#18181b] tabular-nums">
                            ₹{service.flatPrice.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenLiveWork({ type: 'service', service })}
                            title="Open live location & route tracking line"
                            className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-2 text-xs font-semibold text-[#18181b] transition-colors hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
                          >
                            <Navigation className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                            <span>Live</span>
                          </button>

                          {qtyInCart > 0 ? (
                            <div className="inline-flex min-h-[38px] items-center rounded-lg border border-[#e23744] bg-[#fff1f2]">
                              <button
                                type="button"
                                onClick={() => onUpdateCartQty(service.id, -1)}
                                aria-label={`Remove one ${service.title}`}
                                className="flex h-9 w-8 items-center justify-center text-[#be123c] hover:bg-[#ffe4e6] rounded-l-lg cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-[24px] text-center font-mono text-xs font-extrabold text-[#be123c] tabular-nums">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateCartQty(service.id, 1)}
                                aria-label={`Add one more ${service.title}`}
                                className="flex h-9 w-8 items-center justify-center text-[#be123c] hover:bg-[#ffe4e6] rounded-r-lg cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart(service)}
                              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-[#e23744] bg-[#fff1f2] px-3 py-2 text-xs font-bold text-[#be123c] transition-colors hover:bg-[#ffe4e6] whitespace-nowrap cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Add</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onBookService(service)}
                            className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-[#e23744] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#be123c] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                          >
                            Order Now
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Pro Mode: Open Day-to-Day Guaranteed Shifts Grid */}
        {!isConsumer && (
          <>
            {filteredShifts.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-[#e4e4e7] bg-white p-10 text-center">
                <p className="text-base font-bold text-[#18181b]">
                  No open shifts match your current filters
                </p>
                <p className="mt-1 text-sm text-[#52525b]">
                  Widen your payout range or clear category filters to view active blocks.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-[#059669] px-5 py-2 text-sm font-semibold text-white hover:bg-[#047857] cursor-pointer"
                >
                  Show All Open Shifts
                </button>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredShifts.map((shift) => {
                  const isClaimed = claimedShiftIds.includes(shift.id);
                  return (
                    <article
                      key={shift.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow hover:shadow-[0_12px_24px_-8px_rgba(24,24,27,0.08)]"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenLiveWork({ type: 'shift', shift })}
                          className="block w-full text-left cursor-pointer"
                          aria-label={`Track live route for ${shift.title}`}
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-[#f4f4f5]">
                            <ResilientImage
                              src={shift.imageUrl}
                              alt={shift.imageAlt}
                              className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                              fallbackLabel={shift.trade}
                            />
                          </div>
                        </button>

                        <div className="p-6 pb-4">
                          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                            <span className="text-[#71717a]">
                              <span className="text-[#e23744]">{shift.segment}</span>
                              {' · '}
                              {shift.trade} · {shift.distanceKm} km
                            </span>
                            {shift.urgency === 'Urgent Fill' ? (
                              <span className="text-[#d97706]">Urgent Surge</span>
                            ) : (
                              <span className="text-[#059669]">Escrow Locked</span>
                            )}
                          </div>

                          <h3 className="font-display mt-2 text-lg font-bold leading-snug text-[#18181b]">
                            <button
                              type="button"
                              onClick={() => onOpenLiveWork({ type: 'shift', shift })}
                              className="text-left hover:text-[#059669] cursor-pointer"
                            >
                              {shift.title}
                            </button>
                          </h3>
                          <p className="mt-1 text-xs font-medium text-[#52525b]">
                            {shift.employer} · {shift.locality}
                          </p>

                          <p className="mt-3 text-sm leading-relaxed text-[#52525b]">
                            {shift.brief}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#e4e4e7] pt-3 text-xs text-[#52525b]">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#71717a]" aria-hidden="true" />
                              {shift.shiftDate} · {shift.shiftBucket} ({shift.shiftWindow})
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                              {shift.slotsRemaining} slots left
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-[#e4e4e7] px-6 py-4">
                        <div>
                          <p className="text-xs font-medium text-[#71717a]">
                            Guaranteed · {shift.durationHours}h
                          </p>
                          <p className="font-mono text-xl font-extrabold text-[#059669] tabular-nums">
                            ₹{shift.totalPayout.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenLiveWork({ type: 'shift', shift })}
                            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
                          >
                            <Navigation className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                            <span>Live Route</span>
                          </button>

                          {isClaimed ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('bookings')}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#059669] bg-[#ecfdf5] px-4 py-2 text-xs font-semibold text-[#047857] whitespace-nowrap cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                              <span>Schedule</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onClaimShift(shift)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#047857] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              <span>Claim Shift</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Daily High-Demand Jobs & Live Location Map Tracker */}
      <DailyDemandTracker
        hasApiKey={hasApiKey}
        mode={isConsumer ? 'consumer' : 'pro'}
        selectedCity={selectedCity}
        allCities={allCitiesToggle}
        onOpenDemandWork={onOpenDemandWork}
      />

      {/* Live Indian Market Rates & Nearby Google Maps Hubs */}
      <MarketGroundingPanel selectedCity={selectedCity} />
        </>
      )}

      {/* Slim Floating Zomato-Style Order Tray Bar (<= 56px height) */}
      {isConsumer && cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-xl px-4">
          <button
            type="button"
            onClick={onOpenCartDrawer}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-[#18181b] px-5 text-white shadow-[0_14px_30px_rgba(24,24,27,0.28)] transition-transform hover:scale-[1.01] cursor-pointer"
          >
            <span className="flex items-center gap-2.5 text-sm font-bold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#e23744] text-white">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-mono tabular-nums">
                {cartCount} Service{cartCount === 1 ? '' : 's'}
              </span>
              <span className="text-[#a1a1aa]">·</span>
              <span className="font-mono text-[#fecdd3] tabular-nums">
                ₹{cartSubtotal.toLocaleString('en-IN')} + 5% GST
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e23744] px-3.5 py-1.5 text-xs font-bold text-white">
              <span>View Order</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
