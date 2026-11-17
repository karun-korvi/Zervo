import React, { useMemo, useState } from 'react';
import { LocateFixed, Navigation, ShieldCheck, X } from 'lucide-react';
import { CITY_HUB_CENTERS, HERO_DISPATCH_IMAGE, SHIFT_GST_RATE, ZEVRO_CITIES } from '../data/zevroData';
import {
  estimateEtaMinutes,
  findNearestConcernedWorkers,
  haversineDistanceKm,
  inferCategoryFromTitle,
} from '../lib/nearestWorkerDispatch';
import {
  BookingRecord,
  BusinessSegment,
  LatLngPoint,
  ServiceOffering,
  VerifiedPro,
} from '../types/zevro';

export type BookingTarget =
  | { type: 'service'; service: ServiceOffering }
  | { type: 'pro'; pro: VerifiedPro }
  | { type: 'custom' };

interface BookingRequestModalProps {
  target: BookingTarget;
  pros: VerifiedPro[];
  defaultCity: string;
  onClose: () => void;
  onConfirm: (record: BookingRecord) => void;
}

const TIME_SLOTS = [
  'Express · 20–30 min Arrival',
  'Today, 2:00 PM – 3:30 PM',
  'Today, 5:00 PM – 6:30 PM',
  'Today, 9:00 AM – 5:00 PM (8hr Shift)',
  'Tomorrow, 9:00 AM – 10:30 AM',
  'Tomorrow, 9:00 AM – 5:00 PM (8hr Shift)',
];

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  target,
  pros,
  defaultCity,
  onClose,
  onConfirm,
}) => {
  const initialSegment: BusinessSegment =
    target.type === 'service'
      ? target.service.segment
      : target.type === 'pro'
      ? target.pro.segment
      : 'B2C';

  const initialTitle =
    target.type === 'service'
      ? target.service.title
      : target.type === 'pro'
      ? `Direct Dispatch · ${target.pro.primaryTrade} Visit`
      : '';

  const unitPrice =
    target.type === 'service'
      ? target.service.flatPrice
      : target.type === 'pro'
      ? target.pro.flatVisitFee + target.pro.hourlyRate
      : 599;

  const supportsHeadcount =
    target.type === 'service'
      ? Boolean(target.service.allowsHeadcount)
      : target.type === 'custom';

  const [segment, setSegment] = useState<BusinessSegment>(initialSegment);
  const [title, setTitle] = useState(initialTitle);
  const [city, setCity] = useState(
    target.type === 'pro' ? target.pro.city : defaultCity
  );
  const [address, setAddress] = useState(
    initialSegment === 'B2B'
      ? 'Plot 14, 80 Feet Road Logistics Annex'
      : '42, 12th Main Road, HAL 2nd Stage'
  );
  const [slot, setSlot] = useState(
    initialSegment === 'B2B' ? TIME_SLOTS[3] : TIME_SLOTS[0]
  );
  const [headcount, setHeadcount] = useState<number>(
    initialSegment === 'B2B' && supportsHeadcount ? 2 : 1
  );
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [customSiteCoords, setCustomSiteCoords] = useState<LatLngPoint | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('');

  const activeHeadcount = supportsHeadcount && (segment === 'B2B' || headcount > 1) ? headcount : 1;
  const baseAmount = unitPrice * activeHeadcount;
  const gstAmount = Math.round(baseAmount * SHIFT_GST_RATE);
  const totalAmount = baseAmount + gstAmount;

  const cityCoords = useMemo(
    () => CITY_HUB_CENTERS[city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'],
    [city]
  );

  const resolvedCategory = useMemo(() => {
    if (target.type === 'service') return target.service.category;
    if (target.type === 'pro') return target.pro.primaryTrade;
    return inferCategoryFromTitle(title || 'Home Services');
  }, [target, title]);

  const effectiveSiteCoords = useMemo<LatLngPoint>(() => {
    if (customSiteCoords) return customSiteCoords;
    if (target.type === 'service' && city === (target.service.cityAvailability[0] ?? city)) {
      return target.service.siteCoords;
    }
    return cityCoords.defaultSite;
  }, [customSiteCoords, target, city, cityCoords]);

  const rankedCandidates = useMemo(() => {
    return findNearestConcernedWorkers({
      pros,
      category: resolvedCategory,
      city,
      siteCoords: effectiveSiteCoords,
      segment,
      limit: 3,
    });
  }, [pros, resolvedCategory, city, effectiveSiteCoords, segment]);

  const nearestMatch = rankedCandidates[0];
  const backupMatch = rankedCandidates[1];

  const handleLocateDevice = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('Device GPS unavailable — using selected metro zone coordinates.');
      return;
    }
    setGpsStatus('Detecting GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLngPoint = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        setCustomSiteCoords(coords);
        setGpsStatus(`Live GPS locked (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`);
      },
      () => {
        setGpsStatus('Location permission skipped — routing from metro hub coordinates.');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please describe the service or staffing shift you need.');
      return;
    }
    if (address.trim().length < 6) {
      setError('Please enter a valid street address or warehouse gate.');
      return;
    }

    const randomCode = Math.floor(8500 + Math.random() * 1400);
    const escrowCode = `ESC-${Math.floor(1000 + Math.random() * 8999)}-${segment}`;

    const directProDistance =
      target.type === 'pro'
        ? haversineDistanceKm(target.pro.currentCoords, effectiveSiteCoords)
        : nearestMatch?.distanceKm ?? (target.type === 'service' ? target.service.distanceKm : 2.9);

    const directProEta =
      target.type === 'pro'
        ? estimateEtaMinutes(directProDistance)
        : nearestMatch?.etaMinutes ?? (target.type === 'service' ? target.service.etaMinutes : 18);

    const assignedWorker = target.type === 'pro' ? target.pro : nearestMatch?.pro;

    const newBooking: BookingRecord = {
      id: `ZVR-${randomCode}`,
      kind: target.type === 'custom' ? 'custom_request' : 'service_booking',
      segment,
      title: title.trim(),
      counterpartyName: assignedWorker
        ? activeHeadcount > 1 && target.type !== 'pro'
          ? `${assignedWorker.name} (Lead · ${activeHeadcount} Crew)`
          : assignedWorker.name
        : segment === 'B2B'
        ? `Assigned Crew (${activeHeadcount} Staff)`
        : 'Auto-Assigned Verified Pro',
      counterpartyMeta: assignedWorker
        ? `${assignedWorker.specialtyTitle} · ${directProDistance.toFixed(1)} km · ${assignedWorker.rating.toFixed(2)}★`
        : segment === 'B2B'
        ? `B2B Operations · ${activeHeadcount} Staff`
        : 'B2C Escrow Protected Dispatch',
      city,
      address: address.trim(),
      scheduledSlot: slot,
      headcount: activeHeadcount > 1 ? activeHeadcount : undefined,
      gstin: gstin.trim() || undefined,
      amount: baseAmount,
      gstOrFee: gstAmount,
      totalAmount,
      stage: target.type === 'pro' ? 1 : 0,
      status: 'Active',
      escrowCode,
      notes: notes.trim() || undefined,
      serviceCategory: resolvedCategory,
      assignedWorkerId: assignedWorker?.id,
      dispatchStatus: target.type === 'pro' ? 'Accepted' : 'Pinging Nearest',
      hubCoords: assignedWorker?.currentCoords ?? (target.type === 'service' ? target.service.hubCoords : cityCoords.hub),
      siteCoords: effectiveSiteCoords,
      distanceKm: directProDistance,
      etaMinutes: directProEta,
      imageUrl:
        target.type === 'service'
          ? target.service.imageUrl
          : target.type === 'pro'
          ? target.pro.imageUrl
          : HERO_DISPATCH_IMAGE,
    };

    onConfirm(newBooking);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181b]/50 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e4e4e7] pb-4">
          <div>
            <p className="text-xs font-bold tracking-[0.06em] text-[#e23744] uppercase">
              {segment === 'B2B'
                ? 'B2B Daily Operations & Shift Order'
                : 'B2C Instant Service Order'}
            </p>
            <h2
              id="booking-modal-title"
              className="font-display mt-1 text-xl font-bold text-[#18181b]"
            >
              {target.type === 'service'
                ? target.service.title
                : target.type === 'pro'
                ? `Book ${target.pro.name}`
                : 'Post B2C or B2B Service Request'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {target.type === 'custom' && (
            <>
              <div className="flex items-center gap-1 rounded-xl bg-[#f4f4f5] p-1 w-fit">
                {(['B2C', 'B2B'] as const).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setSegment(seg)}
                    className={`min-h-[34px] rounded-lg px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      segment === seg
                        ? 'bg-white text-[#be123c] shadow-xs'
                        : 'text-[#52525b]'
                    }`}
                  >
                    {seg === 'B2C' ? 'B2C Home Need' : 'B2B Business / Warehouse'}
                  </button>
                ))}
              </div>

              <div>
                <label
                  htmlFor="req-title"
                  className="block text-xs font-semibold text-[#52525b]"
                >
                  Service or Staffing Requirement
                </label>
                <input
                  id="req-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    segment === 'B2B'
                      ? 'e.g., 4 Picker & Packers for evening e-commerce dispatch'
                      : 'e.g., Overhead water tank sensor wiring & valve swap'
                  }
                  className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] px-3.5 text-sm text-[#18181b] placeholder:text-[#71717a] focus:border-[#e23744] focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="req-city"
                className="block text-xs font-semibold text-[#52525b]"
              >
                Metro Hub
              </label>
              <select
                id="req-city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setCustomSiteCoords(null);
                  setGpsStatus('');
                }}
                className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-sm font-medium text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
              >
                {ZEVRO_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="req-slot"
                className="block text-xs font-semibold text-[#52525b]"
              >
                Arrival / Shift Window
              </label>
              <select
                id="req-slot"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-sm font-medium text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(supportsHeadcount && (segment === 'B2B' || target.type === 'service')) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="req-headcount"
                  className="block text-xs font-semibold text-[#52525b]"
                >
                  Crew / Staff Count
                </label>
                <select
                  id="req-headcount"
                  value={headcount}
                  onChange={(e) => setHeadcount(Number(e.target.value))}
                  className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 font-mono text-sm font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Staff / Pro' : 'Staff / Pros'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="req-gstin"
                  className="block text-xs font-semibold text-[#52525b]"
                >
                  Company GSTIN (Optional)
                </label>
                <input
                  id="req-gstin"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="29AABCU9603R1ZM"
                  className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] px-3.5 font-mono text-sm text-[#18181b] placeholder:text-[#71717a] focus:border-[#e23744] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="req-address"
                className="block text-xs font-semibold text-[#52525b]"
              >
                Site Address / Warehouse Gate
              </label>
              <button
                type="button"
                onClick={handleLocateDevice}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e23744] hover:text-[#be123c] cursor-pointer"
              >
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Use Current GPS</span>
              </button>
            </div>
            <input
              id="req-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] px-3.5 text-sm text-[#18181b] focus:border-[#e23744] focus:outline-none"
            />
            {gpsStatus && (
              <p className="mt-1 font-mono text-[11px] text-[#059669]">{gpsStatus}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="req-notes"
              className="block text-xs font-semibold text-[#52525b]"
            >
              Operational / Access Notes (Optional)
            </label>
            <textarea
              id="req-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate passcode, supervisor phone, RF scanner dock, or appliance model..."
              className="mt-1.5 w-full rounded-lg border-[1.5px] border-[#e4e4e7] p-3 text-sm text-[#18181b] placeholder:text-[#71717a] focus:border-[#e23744] focus:outline-none"
            />
          </div>

          {/* Zomato-Style Nearest Concerned Worker Auto-Dispatch Preview */}
          {target.type !== 'pro' && nearestMatch && (
            <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.04em] text-[#059669] uppercase">
                  <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Nearest Concerned Worker Auto-Dispatch</span>
                </p>
                <span className="font-mono text-[11px] font-semibold text-[#52525b]">
                  {resolvedCategory}
                </span>
              </div>

              <div className="mt-2.5 flex items-start justify-between gap-3 border-b border-[#e4e4e7] pb-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#18181b]">
                    #1 {nearestMatch.pro.name}
                  </p>
                  <p className="text-xs text-[#52525b]">
                    {nearestMatch.pro.specialtyTitle} · {nearestMatch.pro.locality}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs font-bold text-[#059669] tabular-nums">
                    {nearestMatch.distanceKm.toFixed(1)} km · {nearestMatch.etaMinutes} min
                  </p>
                  <p className="font-mono text-[11px] text-[#71717a] tabular-nums">
                    {nearestMatch.pro.rating.toFixed(2)}★ · {nearestMatch.pro.onTimeRate}% on-time
                  </p>
                </div>
              </div>

              {backupMatch && (
                <p className="mt-2 text-[11px] text-[#52525b]">
                  <strong className="text-[#18181b]">#2 Backup Standby:</strong>{' '}
                  {backupMatch.pro.name} ({backupMatch.distanceKm.toFixed(1)} km ·{' '}
                  {backupMatch.etaMinutes} min) — auto-routed if #1 is busy.
                </p>
              )}
            </div>
          )}

          {/* Transparent Escrow & GST Summary */}
          <dl className="divide-y divide-[#e4e4e7] rounded-xl bg-[#fcfbfa] border border-[#e4e4e7] px-4 py-2 text-sm">
            <div className="flex items-center justify-between py-2">
              <dt className="text-[#52525b]">
                {activeHeadcount > 1
                  ? `Base Rate (₹${unitPrice.toLocaleString('en-IN')} × ${activeHeadcount} staff)`
                  : target.type === 'custom'
                  ? 'Standard Dispatch & Shift Hold'
                  : 'Flat Service / Shift Rate'}
              </dt>
              <dd className="font-mono font-semibold text-[#18181b] tabular-nums">
                ₹{baseAmount.toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-[#52525b]">Shift &amp; Service GST (5% Reduced Rate)</dt>
              <dd className="font-mono font-semibold text-[#18181b] tabular-nums">
                ₹{gstAmount.toLocaleString('en-IN')}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="font-bold text-[#18181b]">Total Escrow Hold</dt>
              <dd className="font-mono text-lg font-extrabold text-[#e23744] tabular-nums">
                ₹{totalAmount.toLocaleString('en-IN')}
              </dd>
            </div>
          </dl>

          {error && (
            <p className="text-xs font-semibold text-[#be123c]">{error}</p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-[#52525b]">
              <ShieldCheck className="h-4 w-4 text-[#059669] shrink-0" aria-hidden="true" />
              <span>Released only after OTP sign-off</span>
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] rounded-lg border border-[#e4e4e7] bg-white px-4 py-2 text-sm font-semibold text-[#18181b] hover:bg-[#f4f4f5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-[#e23744] px-5 py-2 text-sm font-semibold text-white hover:bg-[#be123c] whitespace-nowrap cursor-pointer"
              >
                Place Order &amp; Track Live
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
