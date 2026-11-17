import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  FileText,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import { CITY_HUB_CENTERS } from '../data/zevroData';
import {
  BookingRecord,
  BookingStatus,
  DispatchStage,
  LiveWorkTarget,
  ScreenId,
} from '../types/zevro';
import { FleetMapMarkerItem, LiveFleetOverviewMap } from './LiveFleetOverviewMap';
import { ResilientImage } from './ResilientImage';

interface BookingsDispatchViewProps {
  hasApiKey: boolean;
  bookings: BookingRecord[];
  onAdvanceStage: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onSubmitFeedback: (bookingId: string, rating: number, reviewText: string) => void;
  onRaiseSupportTicket: (bookingId: string, ticketText: string) => void;
  onOpenLiveWork: (target: LiveWorkTarget) => void;
  onNavigate: (screen: ScreenId) => void;
}

const STAGE_LABELS: Record<DispatchStage, string> = {
  0: 'Confirmed',
  1: 'Pro En Route',
  2: 'Work In Progress',
  3: 'Escrow Released',
};

const FILTER_TABS: ('All' | BookingStatus)[] = [
  'All',
  'Active',
  'Completed',
  'Cancelled',
];

export const BookingsDispatchView: React.FC<BookingsDispatchViewProps> = ({
  hasApiKey,
  bookings,
  onAdvanceStage,
  onCancelBooking,
  onSubmitFeedback,
  onRaiseSupportTicket,
  onOpenLiveWork,
  onNavigate,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | BookingStatus>('All');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [feedbackOpenId, setFeedbackOpenId] = useState<string | null>(null);
  const [supportOpenId, setSupportOpenId] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState<number>(5);
  const [draftReview, setDraftReview] = useState<string>('');
  const [draftTicket, setDraftTicket] = useState<string>('');
  const [focusedBookingId, setFocusedBookingId] = useState<string | null>(
    bookings.find((b) => b.status === 'Active')?.id ?? bookings[0]?.id ?? null
  );

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'All') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const fleetMarkers: FleetMapMarkerItem[] = useMemo(() => {
    return filteredBookings
      .filter((b) => b.status !== 'Cancelled')
      .map((b) => {
        const hubFallback =
          CITY_HUB_CENTERS[b.city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];
        return {
          id: b.id,
          title: `${b.id} · ${b.title}`,
          subtitle: `${b.counterpartyName} · ${STAGE_LABELS[b.stage]}`,
          city: `${b.address}, ${b.city}`,
          coords: b.siteCoords ?? hubFallback.defaultSite,
          badgeText:
            b.status === 'Completed'
              ? `${b.id} · Settled`
              : `${b.id} · ${b.etaMinutes ?? 12} min ETA`,
          tone:
            b.status === 'Completed'
              ? 'emerald'
              : b.stage === 1
              ? 'crimson'
              : 'amber',
          actionLabel: 'Open Live Route Line',
        };
      });
  }, [filteredBookings]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4 border-b border-[#e4e4e7] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.06em] text-[#e23744] uppercase">
            Live Fulfillment &amp; Shift Schedule
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-[#18181b]">
            Orders, Bookings &amp; Active Dispatch
          </h1>
          <p className="mt-1 text-sm text-[#52525b]">
            Track real-time arrival stages, verify OTP handoffs, and settle escrow milestones.
          </p>
        </div>

        {/* Status Filter Segmented Bar */}
        <div
          role="tablist"
          aria-label="Filter bookings by status"
          className="inline-flex w-fit items-center gap-1 rounded-xl bg-[#f4f4f5] p-1"
        >
          {FILTER_TABS.map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab)}
                className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-[#be123c] shadow-xs'
                    : 'text-[#52525b] hover:text-[#18181b]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {fleetMarkers.length > 0 && (
        <div className="mt-7">
          <LiveFleetOverviewMap
            hasApiKey={hasApiKey}
            items={fleetMarkers}
            selectedItemId={focusedBookingId}
            onSelectItem={setFocusedBookingId}
            onOpenLiveWork={(id) => {
              const found = bookings.find((b) => b.id === id);
              if (found) onOpenLiveWork({ type: 'booking', booking: found });
            }}
            title="Live Active Dispatch Fleet"
            subtitle="Select any active booking pin or click Track Live Route below to watch the moving route line"
          />
        </div>
      )}

      {filteredBookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#e4e4e7] bg-white p-12 text-center">
          <p className="text-base font-bold text-[#18181b]">
            No {statusFilter === 'All' ? '' : statusFilter.toLowerCase()} bookings right now
          </p>
          <p className="mt-1 text-sm text-[#52525b]">
            Order an everyday service or claim a verified day-to-day shift to track it here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('services')}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-[#e23744] px-5 py-2 text-sm font-semibold text-white hover:bg-[#be123c] cursor-pointer"
            >
              Order Services
            </button>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="inline-flex min-h-[40px] items-center rounded-lg border-[1.5px] border-[#d4d4d8] bg-white px-5 py-2 text-sm font-semibold text-[#18181b] hover:bg-[#f4f4f5] cursor-pointer"
            >
              Explore Day Shifts
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {filteredBookings.map((booking) => {
            const isExpanded = expandedInvoiceId === booking.id;
            const kindLabel =
              booking.kind === 'claimed_shift'
                ? 'Claimed Shift'
                : booking.kind === 'custom_request'
                ? 'Custom Request'
                : booking.kind === 'professional_appointment'
                ? 'Pro Consultation'
                : 'Service Order';

            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-[#e4e4e7] bg-white p-6"
              >
                <div className="flex flex-col gap-4 border-b border-[#e4e4e7] pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#f4f4f5] sm:w-28 shrink-0">
                      <ResilientImage
                        src={booking.imageUrl}
                        alt={booking.title}
                        className="h-full w-full"
                        fallbackLabel={kindLabel}
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-[#71717a]">
                        <span className="font-mono text-[#18181b]">{booking.id}</span>
                        <span aria-hidden="true">·</span>
                        {booking.segment && (
                          <>
                            <span
                              className={
                                booking.segment === 'B2B'
                                  ? 'text-[#e23744]'
                                  : 'text-[#059669]'
                              }
                            >
                              {booking.segment}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{kindLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            booking.status === 'Completed'
                              ? 'text-[#059669]'
                              : booking.status === 'Cancelled'
                              ? 'text-[#be123c]'
                              : 'text-[#d97706]'
                          }
                        >
                          {booking.status === 'Active'
                            ? STAGE_LABELS[booking.stage]
                            : booking.status}
                        </span>
                        {booking.status === 'Active' && booking.dispatchStatus && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                booking.dispatchStatus === 'Fallback Reassigned'
                                  ? 'text-[#be123c]'
                                  : booking.dispatchStatus === 'Accepted'
                                  ? 'text-[#059669]'
                                  : 'text-[#d97706]'
                              }
                            >
                              {booking.dispatchStatus}
                            </span>
                          </>
                        )}
                      </div>

                      <h2 className="font-display mt-2 text-xl font-bold text-[#18181b]">
                        {booking.title}
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#52525b]">
                        <span className="font-semibold text-[#18181b]">
                          {booking.counterpartyName} ({booking.counterpartyMeta})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#71717a]" aria-hidden="true" />
                          {booking.scheduledSlot}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#71717a]" aria-hidden="true" />
                          {booking.address}, {booking.city}
                        </span>
                        {booking.status === 'Active' &&
                          typeof booking.distanceKm === 'number' &&
                          typeof booking.etaMinutes === 'number' && (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#059669] tabular-nums">
                              <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {booking.distanceKm < 1
                                ? `${Math.max(10, Math.round(booking.distanceKm * 1000))} m away`
                                : `${booking.distanceKm.toFixed(1)} km away`}{' '}
                              · takes {booking.etaMinutes} min
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 lg:flex-col lg:items-end">
                    <div className="lg:text-right">
                      <p className="text-xs font-medium text-[#71717a]">
                        {booking.kind === 'claimed_shift'
                          ? 'Guaranteed Payout'
                          : 'Total Escrow Locked'}
                      </p>
                      <p className="font-mono text-2xl font-extrabold text-[#18181b] tabular-nums">
                        ₹{booking.totalAmount.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => onOpenLiveWork({ type: 'booking', booking })}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-[#fcfbfa] px-3 py-1.5 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
                        >
                          <Navigation className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                          <span>Track Live Location</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedInvoiceId(isExpanded ? null : booking.id)
                        }
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isExpanded ? 'Hide Receipt' : 'Escrow Receipt'}</span>
                      </button>

                      {booking.status === 'Active' && booking.stage < 3 && (
                        <button
                          type="button"
                          onClick={() => onAdvanceStage(booking.id)}
                          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer ${
                            booking.kind === 'claimed_shift'
                              ? 'bg-[#059669] hover:bg-[#047857]'
                              : 'bg-[#e23744] hover:bg-[#be123c]'
                          }`}
                        >
                          <span>
                            {booking.stage === 2
                              ? 'Verify OTP & Release Escrow'
                              : `Advance: ${STAGE_LABELS[(booking.stage + 1) as DispatchStage]}`}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {booking.status === 'Active' && booking.stage < 2 && (
                        <button
                          type="button"
                          onClick={() => onCancelBooking(booking.id)}
                          className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 text-xs font-semibold text-[#be123c] hover:bg-[#fff1f2] whitespace-nowrap cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4-Step Dispatch Lifecycle Stepper */}
                {booking.status !== 'Cancelled' && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {([0, 1, 2, 3] as DispatchStage[]).map((step) => {
                      const reached = booking.stage >= step;
                      const current = booking.stage === step && booking.status === 'Active';
                      return (
                        <div key={step} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                                reached
                                  ? step === 3
                                    ? 'bg-[#059669] text-white'
                                    : 'bg-[#e23744] text-white'
                                  : 'bg-[#f4f4f5] text-[#71717a]'
                              }`}
                            >
                              {reached ? (
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                step + 1
                              )}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                current
                                  ? 'text-[#be123c]'
                                  : reached
                                  ? 'text-[#18181b]'
                                  : 'text-[#71717a]'
                              }`}
                            >
                              {STAGE_LABELS[step]}
                            </span>
                          </div>
                          <div
                            className={`h-1 w-full rounded-full ${
                              reached
                                ? step === 3
                                  ? 'bg-[#059669]'
                                  : 'bg-[#e23744]'
                                : 'bg-[#f4f4f5]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Expandable Escrow & GST Receipt */}
                {isExpanded && (
                  <div className="mt-5 border-t border-[#e4e4e7] pt-4 text-xs">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="font-semibold text-[#71717a]">Escrow Reference</p>
                        <p className="mt-1 font-mono font-semibold text-[#18181b]">
                          {booking.escrowCode}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#71717a]">
                          Base {booking.headcount && booking.headcount > 1 ? `(${booking.headcount} Staff)` : 'Rate'}
                        </p>
                        <p className="mt-1 font-mono font-semibold text-[#18181b] tabular-nums">
                          ₹{booking.amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#71717a]">
                          {booking.kind === 'claimed_shift' ? 'Platform Fee (0% Worker Cut)' : 'GST (5% Shift Rate)'}
                        </p>
                        <p className="mt-1 font-mono font-semibold text-[#18181b] tabular-nums">
                          ₹{booking.gstOrFee.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#71717a]">GSTIN / Type</p>
                        <p className="mt-1 font-mono font-semibold text-[#18181b]">
                          {booking.gstin ? booking.gstin : booking.segment ?? 'Standard'}
                        </p>
                      </div>
                    </div>
                    {booking.notes && (
                      <p className="mt-3 flex items-center gap-1.5 text-[#52525b]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#059669] shrink-0" aria-hidden="true" />
                        <span>Site Note: {booking.notes}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Customer Rating, Review & Support Issue Section */}
                {booking.status === 'Completed' && (
                  <div className="mt-5 border-t border-[#e4e4e7] pt-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {booking.rating ? (
                          <div className="flex items-center gap-2 text-[#18181b]">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-[#d97706]">
                              <Star className="h-3.5 w-3.5 fill-[#d97706] text-[#d97706]" aria-hidden="true" />
                              {booking.rating}.0 / 5
                            </span>
                            {booking.reviewText && (
                              <span className="text-[#52525b]">
                                — &ldquo;{booking.reviewText}&rdquo;
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackOpenId(feedbackOpenId === booking.id ? null : booking.id);
                              setSupportOpenId(null);
                              setDraftRating(5);
                              setDraftReview('');
                            }}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-[#fcfbfa] px-3 py-1.5 font-semibold text-[#18181b] hover:bg-[#f4f4f5] cursor-pointer"
                          >
                            <Star className="h-3.5 w-3.5 text-[#d97706]" aria-hidden="true" />
                            <span>Rate Service &amp; Review</span>
                          </button>
                        )}

                        {booking.supportTicket ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#be123c]">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Support Ticket Filed: {booking.supportTicket}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSupportOpenId(supportOpenId === booking.id ? null : booking.id);
                              setFeedbackOpenId(null);
                              setDraftTicket('');
                            }}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3 py-1.5 font-semibold text-[#52525b] hover:text-[#be123c] hover:bg-[#fff1f2] cursor-pointer"
                          >
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Raise Support Issue</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {feedbackOpenId === booking.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          onSubmitFeedback(
                            booking.id,
                            draftRating,
                            draftReview.trim() || 'Prompt arrival and clean work.'
                          );
                          setFeedbackOpenId(null);
                        }}
                        className="mt-3 flex flex-col gap-3 rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4 sm:flex-row sm:items-end"
                      >
                        <div>
                          <span className="block font-semibold text-[#52525b]">Star Rating</span>
                          <div className="mt-1.5 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setDraftRating(star)}
                                aria-label={`Rate ${star} stars`}
                                className="p-1 cursor-pointer"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    star <= draftRating
                                      ? 'fill-[#d97706] text-[#d97706]'
                                      : 'text-[#d4d4d8]'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex-1">
                          <label
                            htmlFor={`review-${booking.id}`}
                            className="block font-semibold text-[#52525b]"
                          >
                            Feedback Comment
                          </label>
                          <input
                            id={`review-${booking.id}`}
                            type="text"
                            value={draftReview}
                            onChange={(e) => setDraftReview(e.target.value)}
                            placeholder="Share punctuality, skill quality, or hygiene notes..."
                            className="mt-1.5 h-9 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-xs text-[#18181b] focus:border-[#059669] focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="inline-flex min-h-[36px] items-center rounded-lg bg-[#059669] px-4 py-1.5 font-bold text-white hover:bg-[#047857] cursor-pointer"
                        >
                          Submit Rating
                        </button>
                      </form>
                    )}

                    {supportOpenId === booking.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!draftTicket.trim()) return;
                          onRaiseSupportTicket(booking.id, draftTicket.trim());
                          setSupportOpenId(null);
                        }}
                        className="mt-3 flex flex-col gap-3 rounded-xl border border-[#fecdd3] bg-[#fff1f2] p-4 sm:flex-row sm:items-end"
                      >
                        <div className="flex-1">
                          <label
                            htmlFor={`ticket-${booking.id}`}
                            className="block font-semibold text-[#be123c]"
                          >
                            Describe Issue for ZEVRO Support Ops
                          </label>
                          <input
                            id={`ticket-${booking.id}`}
                            type="text"
                            value={draftTicket}
                            onChange={(e) => setDraftTicket(e.target.value)}
                            placeholder="e.g., Invoice correction, partial rework under warranty, or delay credit..."
                            className="mt-1.5 h-9 w-full rounded-lg border-[1.5px] border-[#fecdd3] bg-white px-3 text-xs text-[#18181b] focus:border-[#e23744] focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="inline-flex min-h-[36px] items-center rounded-lg bg-[#e23744] px-4 py-1.5 font-bold text-white hover:bg-[#be123c] cursor-pointer"
                        >
                          Submit Ticket
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
