import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  MapPin,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react';
import {
  ALL_SERVICE_CATEGORIES,
  CITY_HUB_CENTERS,
  PROFESSIONAL_CATEGORIES,
  SHIFT_GST_RATE,
  ZEVRO_CITIES,
} from '../data/zevroData';
import serviceElectricalPanelImg from '../assets/images/service_electrical_panel_1794748348641.jpg';
import servicePickerPackerImg from '../assets/images/service_picker_packer_1794748637764.jpg';
import serviceVehicleRoadsideImg from '../assets/images/service_vehicle_roadside_1794751979827.jpg';
import { estimateEtaMinutes, haversineDistanceKm } from '../lib/nearestWorkerDispatch';
import {
  BookingRecord,
  BusinessSegment,
  ProfessionalCategory,
  ServiceCategory,
  VerifiedPro,
} from '../types/zevro';
import { ResilientImage } from './ResilientImage';

interface ProsDirectoryViewProps {
  pros: VerifiedPro[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  onBookPro: (pro: VerifiedPro, customSlot?: string) => void;
  onConfirmAppointment: (booking: BookingRecord) => void;
  onRegisterWorker: (pro: VerifiedPro, accountRole: 'Worker' | 'Partner') => void;
  initialProCategory?: ProfessionalCategory | 'All';
  openRegisterOnMount?: boolean;
  onResetRegisterPrompt?: () => void;
}

export const ProsDirectoryView: React.FC<ProsDirectoryViewProps> = ({
  pros,
  selectedCity,
  onCityChange,
  onConfirmAppointment,
  onRegisterWorker,
  initialProCategory = 'All',
  openRegisterOnMount = false,
  onResetRegisterPrompt,
}) => {
  const [proCategoryFilter, setProCategoryFilter] = useState<'All' | ProfessionalCategory>(
    initialProCategory
  );
  const [tradeFilter, setTradeFilter] = useState<ServiceCategory>('All');
  const [segmentFilter, setSegmentFilter] = useState<'All' | BusinessSegment>('All');
  const [allCities, setAllCities] = useState(true);

  // Appointment 9-Step Booking Drawer State
  const [bookingPro, setBookingPro] = useState<VerifiedPro | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientOrClientNotes, setPatientOrClientNotes] = useState<string>('');
  const [consultationMode, setConsultationMode] = useState<'In-Person / Home' | 'Online Video'>('In-Person / Home');

  // Become a Worker / Partner Registration Modal State
  const [registerOpen, setRegisterOpen] = useState(openRegisterOnMount);
  const [accountRole, setAccountRole] = useState<'Worker' | 'Partner'>('Worker');
  const [workerName, setWorkerName] = useState('');
  const [workerTrade, setWorkerTrade] = useState<Exclude<ServiceCategory, 'All'>>('Home Services');
  const [workerSegment, setWorkerSegment] = useState<BusinessSegment>('B2C');
  const [workerCity, setWorkerCity] = useState(selectedCity);
  const [workerLocality, setWorkerLocality] = useState('Indiranagar & Koramangala');
  const [workerYears, setWorkerYears] = useState(3);
  const [workerAvailability, setWorkerAvailability] = useState<
    'Full-Time' | 'Part-Time' | 'Shift-Flexible'
  >('Full-Time');
  const [workerPreference, setWorkerPreference] = useState<
    'Daily' | 'Monthly' | 'Daily & Monthly'
  >('Daily & Monthly');
  const [workerRegistrationId, setWorkerRegistrationId] = useState('');
  const [workerBio, setWorkerBio] = useState('');
  const [formError, setFormError] = useState('');

  React.useEffect(() => {
    setProCategoryFilter(initialProCategory);
  }, [initialProCategory]);

  React.useEffect(() => {
    if (openRegisterOnMount) {
      setRegisterOpen(true);
      onResetRegisterPrompt?.();
    }
  }, [openRegisterOnMount, onResetRegisterPrompt]);

  const filteredPros = useMemo(() => {
    return pros.filter((pro) => {
      const matchesProCat =
        proCategoryFilter === 'All' || pro.professionalCategory === proCategoryFilter;
      const matchesSegment =
        segmentFilter === 'All' || pro.segment === segmentFilter;
      const matchesTrade =
        tradeFilter === 'All' || pro.primaryTrade === tradeFilter;
      const matchesCity = allCities || pro.city === selectedCity;
      return matchesProCat && matchesSegment && matchesTrade && matchesCity;
    });
  }, [pros, proCategoryFilter, segmentFilter, tradeFilter, allCities, selectedCity]);

  const handleOpenBooking = (pro: VerifiedPro) => {
    setBookingPro(pro);
    setSelectedSlot(pro.availableSlots?.[0] ?? pro.nextAvailable);
    setPatientOrClientNotes('');
    setConsultationMode('In-Person / Home');
  };

  const handleConfirmProBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingPro) return;

    const cityCoords =
      CITY_HUB_CENTERS[bookingPro.city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];
    const baseFee = bookingPro.hourlyRate;
    const gstAmount = Math.round(baseFee * SHIFT_GST_RATE);
    const totalAmount = baseFee + gstAmount;
    const hubPoint = bookingPro.currentCoords ?? cityCoords.hub;
    const distKm = haversineDistanceKm(hubPoint, cityCoords.defaultSite);
    const etaMins = estimateEtaMinutes(distKm);

    const newBooking: BookingRecord = {
      id: `ZVR-${Math.floor(8600 + Math.random() * 1300)}`,
      kind: bookingPro.professionalCategory ? 'professional_appointment' : 'service_booking',
      segment: bookingPro.segment,
      title: `${bookingPro.professionalCategory ? `${bookingPro.professionalCategory} Consultation` : bookingPro.specialtyTitle} — ${bookingPro.name}`,
      counterpartyName: bookingPro.name,
      counterpartyMeta: `${bookingPro.specialtyTitle}${bookingPro.registrationNumber ? ` · ${bookingPro.registrationNumber}` : ''} · ${distKm.toFixed(1)} km`,
      city: bookingPro.city,
      address: `${consultationMode} · ${bookingPro.locality}`,
      scheduledSlot: selectedSlot || bookingPro.nextAvailable,
      amount: baseFee,
      gstOrFee: gstAmount,
      totalAmount,
      stage: 0,
      status: 'Active',
      escrowCode: `ESC-${Math.floor(1000 + Math.random() * 8999)}-PRO`,
      notes: patientOrClientNotes.trim() || `${consultationMode} appointment confirmed.`,
      serviceCategory: bookingPro.primaryTrade,
      assignedWorkerId: bookingPro.id,
      dispatchStatus: 'Accepted',
      hubCoords: hubPoint,
      siteCoords: cityCoords.defaultSite,
      distanceKm: distKm,
      etaMinutes: etaMins,
      imageUrl: bookingPro.imageUrl,
    };

    onConfirmAppointment(newBooking);
    setBookingPro(null);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      setFormError('Enter your full name to register your ZEVRO profile.');
      return;
    }

    const parts = workerName.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : workerName.trim().slice(0, 2).toUpperCase();

    const cityHub =
      CITY_HUB_CENTERS[workerCity] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];

    const imageByTrade =
      workerTrade === 'Vehicle & Transportation'
        ? serviceVehicleRoadsideImg
        : workerTrade === 'Logistics & Warehouse'
        ? servicePickerPackerImg
        : serviceElectricalPanelImg;

    const newWorker: VerifiedPro = {
      id: `pro-${Date.now()}`,
      name: workerName.trim(),
      initials,
      segment: workerSegment,
      primaryTrade: workerTrade,
      specialtyTitle: `${workerTrade} ${accountRole}`,
      qualifications: `${workerYears} yrs verified experience`,
      registrationNumber: workerRegistrationId.trim() || undefined,
      availableSlots: ['Today, 4:00 PM', 'Tomorrow, 10:00 AM'],
      city: workerCity,
      locality: workerLocality.trim() || 'Central Operations Zone',
      yearsExperience: workerYears,
      completedJobs: 1,
      rating: 4.9,
      onTimeRate: 98,
      hourlyRate: workerTrade === 'Healthcare & Medical' || workerTrade === 'Professional Services' ? 499 : 249,
      flatVisitFee: workerTrade === 'Logistics & Warehouse' ? 99 : 149,
      nextAvailable: 'Available Today',
      availability: workerAvailability,
      workPreference: workerPreference,
      verificationStatus: 'Pending Review',
      credentials: [
        'Govt ID Submitted',
        workerRegistrationId.trim() ? `Reg #${workerRegistrationId.trim()}` : `${workerTrade} Skill Profile`,
      ],
      bio:
        workerBio.trim() ||
        `Registered ZEVRO ${workerTrade.toLowerCase()} ${accountRole.toLowerCase()} with ${workerYears} years of experience.`,
      currentCoords: cityHub.hub,
      imageUrl: imageByTrade,
      imageAlt: `${workerName.trim()} — ZEVRO ${workerTrade} specialist`,
    };

    onRegisterWorker(newWorker, accountRole);
    setRegisterOpen(false);
    setWorkerName('');
    setWorkerBio('');
    setWorkerRegistrationId('');
    setFormError('');
  };

  const showMedicalSafetyNotice =
    proCategoryFilter === 'Doctor' ||
    proCategoryFilter === 'Counsellor' ||
    tradeFilter === 'Healthcare & Medical';

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4 border-b border-[#e4e4e7] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.06em] text-[#e23744] uppercase">
            ZEVRO Book a Professional · Verified Experts &amp; Specialists
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-[#18181b]">
            Book Qualified Professionals &amp; Verified Workers
          </h1>
          <p className="mt-1 text-sm text-[#52525b]">
            Select a category, inspect verified qualifications and open slots, pick a date &amp; time, and book with escrow protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAccountRole('Partner');
              setRegisterOpen(true);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3.5 py-2 text-xs font-bold text-[#18181b] transition-colors hover:bg-[#f4f4f5] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Stethoscope className="h-4 w-4 text-[#e23744]" aria-hidden="true" />
            <span>Become a Partner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountRole('Worker');
              setRegisterOpen(true);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#047857] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Become a Worker</span>
          </button>

          <label htmlFor="pros-city-filter" className="sr-only">
            Filter specialists by city
          </label>
          <select
            id="pros-city-filter"
            value={allCities ? 'ALL' : selectedCity}
            onChange={(e) => {
              if (e.target.value === 'ALL') {
                setAllCities(true);
              } else {
                setAllCities(false);
                onCityChange(e.target.value);
              }
            }}
            className="min-h-[40px] rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Metro Hubs</option>
            {ZEVRO_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOOK A PROFESSIONAL: 10 Dedicated Consultation Categories */}
      <section aria-label="Book a Professional Categories" className="mt-6 rounded-2xl border border-[#e4e4e7] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#18181b]">
              Book a Professional (10 Consultation Categories)
            </h2>
            <p className="text-xs text-[#52525b]">
              Choose Doctor, Teacher, Swimming Coach, CA, Trainer, Dietitian, Counsellor, Architect, Interior Designer, or Business Consultant.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by 15 ZEVRO Categories"
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value as ServiceCategory)}
              className="h-9 rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
            >
              {ALL_SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All 15 Trade Categories' : cat}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by customer segment"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as 'All' | BusinessSegment)}
              className="h-9 rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
            >
              <option value="All">All (B2C &amp; B2B)</option>
              <option value="B2C">B2C Individual</option>
              <option value="B2B">B2B Business</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setProCategoryFilter('All')}
            className={`min-h-[36px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              proCategoryFilter === 'All'
                ? 'border-[#e23744] bg-[#fff1f2] text-[#be123c]'
                : 'border-[#e4e4e7] bg-[#fcfbfa] text-[#52525b] hover:text-[#18181b]'
            }`}
          >
            All Verified Pros
          </button>
          {PROFESSIONAL_CATEGORIES.map((pCat) => {
            const active = proCategoryFilter === pCat.id;
            return (
              <button
                key={pCat.id}
                type="button"
                onClick={() => setProCategoryFilter(pCat.id)}
                className={`min-h-[36px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-[#e23744] bg-[#fff1f2] text-[#be123c]'
                    : 'border-[#e4e4e7] bg-[#fcfbfa] text-[#52525b] hover:text-[#18181b]'
                }`}
              >
                {pCat.id}
              </button>
            );
          })}
        </div>
      </section>

      {/* Healthcare Compliance & Emergency Notice */}
      {showMedicalSafetyNotice && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#fecdd3] bg-[#fff1f2] p-4 text-xs text-[#881337]">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-[#e23744] shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold text-[#9f1239]">
              Healthcare Registration Verification &amp; Emergency Care Protocol
            </p>
            <p className="mt-0.5 leading-relaxed">
              ZEVRO verifies medical registration numbers (NMC / State Medical Council) and qualifications for every doctor under applicable telemedicine guidelines. For life-threatening emergencies, chest pain, or acute trauma, contact emergency ambulance services immediately (<strong className="font-mono">108 / 112</strong>) rather than booking a scheduled appointment.
            </p>
          </div>
        </div>
      )}

      {filteredPros.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#e4e4e7] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#18181b]">
            No verified pros in this filter
          </p>
          <button
            type="button"
            onClick={() => {
              setProCategoryFilter('All');
              setTradeFilter('All');
              setSegmentFilter('All');
              setAllCities(true);
            }}
            className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-[#e23744] px-5 py-2 text-sm font-semibold text-white hover:bg-[#be123c] cursor-pointer"
          >
            Show All Professionals
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPros.map((pro) => (
            <article
              key={pro.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow hover:shadow-[0_12px_24px_-8px_rgba(24,24,27,0.08)]"
            >
              <div>
                <div className="aspect-[16/10] w-full overflow-hidden bg-[#f4f4f5]">
                  <ResilientImage
                    src={pro.imageUrl}
                    alt={pro.imageAlt}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                    fallbackLabel={pro.professionalCategory ?? pro.primaryTrade}
                  />
                </div>

                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        aria-hidden="true"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1f2] font-mono text-sm font-bold text-[#be123c] shrink-0"
                      >
                        {pro.initials}
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#18181b]">
                          {pro.name}
                        </h2>
                        <p className="text-xs font-semibold text-[#71717a]">
                          <span className={pro.segment === 'B2B' ? 'text-[#e23744]' : 'text-[#059669]'}>
                            {pro.professionalCategory ?? pro.segment}
                          </span>
                          {' · '}
                          {pro.primaryTrade} · {pro.yearsExperience} yrs
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#18181b] tabular-nums shrink-0">
                      {pro.rating.toFixed(2)} ★
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs font-bold text-[#18181b]">
                    {pro.specialtyTitle}
                  </p>
                  {pro.qualifications && (
                    <p className="mt-1 text-xs text-[#52525b]">
                      {pro.qualifications}
                    </p>
                  )}

                  <p className="mt-2.5 text-xs font-semibold text-[#52525b]">
                    <span
                      className={
                        pro.verificationStatus === 'Verified'
                          ? 'text-[#059669]'
                          : 'text-[#d97706]'
                      }
                    >
                      {pro.verificationStatus}
                    </span>
                    {' · '}
                    {pro.availability}
                    {' · '}
                    {pro.workPreference}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed text-[#52525b]">
                    {pro.bio}
                  </p>

                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#52525b]">
                    <MapPin className="h-3.5 w-3.5 text-[#e23744] shrink-0" aria-hidden="true" />
                    <span>
                      {pro.locality}, {pro.city}
                    </span>
                  </p>

                  {/* Tabular Reliability Row */}
                  <dl className="mt-4 grid grid-cols-2 divide-x divide-[#e4e4e7] border-y border-[#e4e4e7] py-3 text-xs">
                    <div className="pr-3">
                      <dt className="text-[#71717a]">Completed Consults/Jobs</dt>
                      <dd className="mt-0.5 font-mono text-sm font-bold text-[#18181b] tabular-nums">
                        {pro.completedJobs.toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="pl-3">
                      <dt className="text-[#71717a]">On-Time Arrival</dt>
                      <dd className="mt-0.5 font-mono text-sm font-bold text-[#059669] tabular-nums">
                        {pro.onTimeRate}%
                      </dd>
                    </div>
                  </dl>

                  {/* Unboxed Credential List */}
                  <ul className="mt-4 space-y-1.5 text-xs font-medium text-[#18181b]">
                    {pro.credentials.map((cred) => (
                      <li key={cred} className="flex items-center gap-2">
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-[#059669] shrink-0"
                          aria-hidden="true"
                        />
                        <span>{cred}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#e4e4e7] px-6 py-4">
                <div>
                  <p className="text-xs text-[#71717a]">
                    Next slot: {pro.nextAvailable}
                  </p>
                  <p className="font-mono text-base font-extrabold text-[#18181b] tabular-nums">
                    ₹{pro.hourlyRate}{' '}
                    <span className="text-xs font-normal text-[#71717a]">
                      {pro.professionalCategory ? 'consultation' : 'session'}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBooking(pro)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#e23744] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#be123c] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>{pro.professionalCategory ? 'Book Slot' : 'Book Direct'}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Professional Appointment Booking Modal (Steps 4–7 of Book a Professional Flow) */}
      {bookingPro && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-appointment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181b]/55 p-4 backdrop-blur-[2px]"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#e4e4e7] pb-4">
              <div>
                <p className="text-xs font-bold text-[#e23744] uppercase">
                  {bookingPro.professionalCategory ?? bookingPro.primaryTrade} Appointment
                </p>
                <h2
                  id="pro-appointment-title"
                  className="font-display mt-1 text-xl font-extrabold text-[#18181b]"
                >
                  Book Consultation with {bookingPro.name}
                </h2>
                <p className="mt-0.5 text-xs text-[#52525b]">
                  {bookingPro.qualifications ?? bookingPro.specialtyTitle}
                  {bookingPro.registrationNumber ? ` · ${bookingPro.registrationNumber}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingPro(null)}
                aria-label="Close appointment dialog"
                className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmProBooking} className="mt-4 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-[#52525b]">
                  Appointment Mode
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(['In-Person / Home', 'Online Video'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setConsultationMode(m)}
                      className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
                        consultationMode === m
                          ? 'border-[#e23744] bg-[#fff1f2] text-[#be123c]'
                          : 'border-[#e4e4e7] bg-[#fcfbfa] text-[#52525b]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#52525b]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                  Select Available Date &amp; Time Slot
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(bookingPro.availableSlots ?? [bookingPro.nextAvailable, 'Tomorrow, 10:00 AM']).map(
                    (slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                          selectedSlot === slot
                            ? 'border-[#059669] bg-[#ecfdf5] text-[#047857]'
                            : 'border-[#e4e4e7] bg-white text-[#52525b] hover:border-[#d4d4d8]'
                        }`}
                      >
                        {slot}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="pro-notes" className="block text-xs font-semibold text-[#52525b]">
                  Consultation Agenda / Notes (Optional)
                </label>
                <input
                  id="pro-notes"
                  type="text"
                  value={patientOrClientNotes}
                  onChange={(e) => setPatientOrClientNotes(e.target.value)}
                  placeholder="e.g., Class 11 Calculus prep, GST audit review, or general checkup..."
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#e23744] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#52525b]">Consultation Fee</span>
                  <span className="font-mono font-bold text-[#18181b] tabular-nums">
                    ₹{bookingPro.hourlyRate.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between">
                  <span className="text-[#52525b]">GST (5% Reduced Shift Rate)</span>
                  <span className="font-mono font-semibold text-[#18181b] tabular-nums">
                    ₹{Math.round(bookingPro.hourlyRate * SHIFT_GST_RATE).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-[#e4e4e7] pt-2 font-bold text-[#18181b]">
                  <span>Total Escrow Payable</span>
                  <span className="font-mono text-sm text-[#e23744] tabular-nums">
                    ₹{(bookingPro.hourlyRate + Math.round(bookingPro.hourlyRate * SHIFT_GST_RATE)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingPro(null)}
                  className="min-h-[40px] rounded-lg border border-[#e4e4e7] bg-white px-4 py-2 text-xs font-semibold text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-lg bg-[#e23744] px-5 py-2 text-xs font-bold text-white hover:bg-[#be123c] cursor-pointer"
                >
                  Confirm &amp; Lock Escrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Become a Worker / Partner Registration Modal */}
      {registerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="worker-register-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181b]/55 p-4 backdrop-blur-[2px]"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#e4e4e7] pb-4">
              <div>
                <p className="text-xs font-bold text-[#059669] uppercase">
                  ZEVRO Earn Onboarding · Become a {accountRole}
                </p>
                <h2
                  id="worker-register-title"
                  className="font-display mt-1 text-xl font-extrabold text-[#18181b]"
                >
                  Register Your ZEVRO {accountRole} Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRegisterOpen(false)}
                aria-label="Close registration modal"
                className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['Worker', 'Partner'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAccountRole(r)}
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                      accountRole === r
                        ? 'border-[#059669] bg-[#ecfdf5] text-[#047857]'
                        : 'border-[#e4e4e7] bg-[#fcfbfa] text-[#52525b]'
                    }`}
                  >
                    Register as {r}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="worker-name" className="block text-xs font-semibold text-[#52525b]">
                  Full Name / Clinic or Studio Name
                </label>
                <input
                  id="worker-name"
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="e.g., Rahul Kumar or Dr. Ritu Sharma"
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#059669] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="worker-trade" className="block text-xs font-semibold text-[#52525b]">
                    ZEVRO Category (15 Options)
                  </label>
                  <select
                    id="worker-trade"
                    value={workerTrade}
                    onChange={(e) =>
                      setWorkerTrade(e.target.value as Exclude<ServiceCategory, 'All'>)
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
                  >
                    {ALL_SERVICE_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="worker-segment" className="block text-xs font-semibold text-[#52525b]">
                    Customer Segment
                  </label>
                  <select
                    id="worker-segment"
                    value={workerSegment}
                    onChange={(e) => setWorkerSegment(e.target.value as BusinessSegment)}
                    className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
                  >
                    <option value="B2C">B2C Individual Customers</option>
                    <option value="B2B">B2B Businesses &amp; Institutions</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="worker-city" className="block text-xs font-semibold text-[#52525b]">
                    Operating City
                  </label>
                  <select
                    id="worker-city"
                    value={workerCity}
                    onChange={(e) => setWorkerCity(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
                  >
                    {ZEVRO_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="worker-years" className="block text-xs font-semibold text-[#52525b]">
                    Experience (Years)
                  </label>
                  <input
                    id="worker-years"
                    type="number"
                    min={0}
                    max={40}
                    value={workerYears}
                    onChange={(e) => setWorkerYears(Number(e.target.value) || 0)}
                    className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 font-mono text-sm font-bold text-[#18181b] tabular-nums focus:border-[#059669] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="worker-avail" className="block text-xs font-semibold text-[#52525b]">
                    Availability
                  </label>
                  <select
                    id="worker-avail"
                    value={workerAvailability}
                    onChange={(e) =>
                      setWorkerAvailability(
                        e.target.value as 'Full-Time' | 'Part-Time' | 'Shift-Flexible'
                      )
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Shift-Flexible">Shift-Flexible</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="worker-pref" className="block text-xs font-semibold text-[#52525b]">
                    Work Preference
                  </label>
                  <select
                    id="worker-pref"
                    value={workerPreference}
                    onChange={(e) =>
                      setWorkerPreference(
                        e.target.value as 'Daily' | 'Monthly' | 'Daily & Monthly'
                      )
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] focus:border-[#059669] focus:outline-none cursor-pointer"
                  >
                    <option value="Daily & Monthly">Daily &amp; Monthly</option>
                    <option value="Daily">Daily Shifts Only</option>
                    <option value="Monthly">Monthly Contract</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="worker-reg" className="block text-xs font-semibold text-[#52525b]">
                  License / Registration Number (Doctors, Swimming Coaches, CAs, Drivers — Optional)
                </label>
                <input
                  id="worker-reg"
                  type="text"
                  value={workerRegistrationId}
                  onChange={(e) => setWorkerRegistrationId(e.target.value)}
                  placeholder="e.g., KMC #84219, ICAI #518920, or ITI Wireman Cert"
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#059669] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="worker-locality" className="block text-xs font-semibold text-[#52525b]">
                  Preferred Localities
                </label>
                <input
                  id="worker-locality"
                  type="text"
                  value={workerLocality}
                  onChange={(e) => setWorkerLocality(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#059669] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="worker-bio" className="block text-xs font-semibold text-[#52525b]">
                  Skills &amp; Qualifications Summary (Optional)
                </label>
                <input
                  id="worker-bio"
                  type="text"
                  value={workerBio}
                  onChange={(e) => setWorkerBio(e.target.value)}
                  placeholder="e.g., Own tools, MBBS/B.Tech, languages spoken"
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#059669] focus:bg-white focus:outline-none"
                />
              </div>

              {formError && (
                <p className="text-xs font-semibold text-[#be123c]">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-[#e4e4e7] pt-4">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="min-h-[40px] rounded-lg border border-[#e4e4e7] bg-white px-4 py-2 text-xs font-semibold text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-lg bg-[#059669] px-5 py-2 text-xs font-bold text-white hover:bg-[#047857] cursor-pointer"
                >
                  Submit {accountRole} Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
