import React, { useMemo, useState } from 'react';
import { LocateFixed, Minus, Navigation, Plus, ShieldCheck, ShoppingBag, Trash2, X } from 'lucide-react';
import { CITY_HUB_CENTERS, SHIFT_GST_RATE, ZEVRO_CITIES } from '../data/zevroData';
import { findNearestConcernedWorkers } from '../lib/nearestWorkerDispatch';
import { BookingRecord, LatLngPoint, OrderCartItem, VerifiedPro } from '../types/zevro';

interface OrderCartDrawerProps {
  items: OrderCartItem[];
  pros: VerifiedPro[];
  defaultCity: string;
  onUpdateQty: (serviceId: string, delta: number) => void;
  onRemoveItem: (serviceId: string) => void;
  onClearCart: () => void;
  onClose: () => void;
  onPlaceOrder: (createdBookings: BookingRecord[]) => void;
}

const ORDER_WINDOWS = [
  'Express · 20–30 min Arrival',
  'Today, 2:00 PM – 3:30 PM',
  'Today, 6:00 PM – 8:00 PM',
  'Tomorrow, 9:00 AM – 5:00 PM (8hr Shift)',
];

export const OrderCartDrawer: React.FC<OrderCartDrawerProps> = ({
  items,
  pros,
  defaultCity,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onClose,
  onPlaceOrder,
}) => {
  const hasB2B = items.some((i) => i.service.segment === 'B2B');

  const [city, setCity] = useState(defaultCity);
  const [address, setAddress] = useState(
    hasB2B
      ? 'Plot 14, 80 Feet Road Logistics Annex'
      : '42, 12th Main Road, HAL 2nd Stage'
  );
  const [slot, setSlot] = useState(ORDER_WINDOWS[0]);
  const [gstin, setGstin] = useState('');
  const [error, setError] = useState('');
  const [customSiteCoords, setCustomSiteCoords] = useState<LatLngPoint | null>(null);
  const [gpsStatus, setGpsStatus] = useState('');

  const subtotal = items.reduce(
    (sum, item) => sum + item.service.flatPrice * item.quantity,
    0
  );
  const gstAmount = Math.round(subtotal * SHIFT_GST_RATE);
  const totalAmount = subtotal + gstAmount;
  const totalStaffCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const cityCoords = useMemo(
    () => CITY_HUB_CENTERS[city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'],
    [city]
  );

  const itemDispatchMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findNearestConcernedWorkers>[0]>();
    items.forEach(({ service }) => {
      const targetSite = customSiteCoords ?? service.siteCoords ?? cityCoords.defaultSite;
      const ranked = findNearestConcernedWorkers({
        pros,
        category: service.category,
        city,
        siteCoords: targetSite,
        segment: service.segment,
        limit: 1,
      });
      if (ranked[0]) {
        map.set(service.id, ranked[0]);
      }
    });
    return map;
  }, [items, pros, city, customSiteCoords, cityCoords]);

  const handleLocateDevice = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('Device GPS unavailable — using metro hub coordinates.');
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

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (address.trim().length < 6) {
      setError('Please enter a valid delivery site address or warehouse gate.');
      return;
    }

    const newBookings: BookingRecord[] = items.map((item, idx) => {
      const base = item.service.flatPrice * item.quantity;
      const gst = Math.round(base * SHIFT_GST_RATE);
      const randomCode = Math.floor(8700 + Math.random() * 1100) + idx;
      const nearest = itemDispatchMap.get(item.service.id);
      const targetSite = customSiteCoords ?? item.service.siteCoords ?? cityCoords.defaultSite;

      return {
        id: `ZVR-${randomCode}`,
        kind: 'service_booking',
        segment: item.service.segment,
        title: item.service.title,
        counterpartyName: nearest
          ? item.quantity > 1
            ? `${nearest.pro.name} (Lead · ${item.quantity} Crew)`
            : nearest.pro.name
          : item.service.segment === 'B2B'
          ? `Assigned Crew (${item.quantity} Staff)`
          : 'Auto-Assigned Verified Pro',
        counterpartyMeta: nearest
          ? `${nearest.pro.specialtyTitle} · ${nearest.distanceKm.toFixed(1)} km · ${nearest.pro.rating.toFixed(2)}★`
          : item.service.segment === 'B2B'
          ? `B2B Order Tray · ${item.quantity} Staff`
          : 'ZEVRO Express Dispatch',
        city,
        address: address.trim(),
        scheduledSlot: slot,
        headcount: item.quantity > 1 ? item.quantity : undefined,
        gstin: gstin.trim() || undefined,
        amount: base,
        gstOrFee: gst,
        totalAmount: base + gst,
        stage: 0,
        status: 'Active',
        escrowCode: `ESC-${Math.floor(1000 + Math.random() * 8999)}-${item.service.segment}`,
        notes: `${item.service.category} order placed via ZEVRO Order Tray`,
        serviceCategory: item.service.category,
        assignedWorkerId: nearest?.pro.id,
        dispatchStatus: 'Pinging Nearest',
        hubCoords: nearest?.pro.currentCoords ?? item.service.hubCoords ?? cityCoords.hub,
        siteCoords: targetSite,
        distanceKm: nearest?.distanceKm ?? item.service.distanceKm,
        etaMinutes: nearest?.etaMinutes ?? item.service.etaMinutes,
        imageUrl: item.service.imageUrl,
      };
    });

    onPlaceOrder(newBookings);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-tray-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#18181b]/50 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-[#e4e4e7] bg-[#fcfbfa] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffe4e6] text-[#e23744]">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="order-tray-title"
                className="font-display text-lg font-extrabold text-[#18181b]"
              >
                Your Service Order Tray
              </h2>
              <p className="font-mono text-xs text-[#71717a] tabular-nums">
                {items.length} service{items.length === 1 ? '' : 's'} · {totalStaffCount} unit{totalStaffCount === 1 ? '' : 's'}/staff
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order tray"
            className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-[#e4e4e7] bg-white p-8 text-center">
              <p className="text-base font-bold text-[#18181b]">
                Your service order tray is empty
              </p>
              <p className="mt-1 text-sm text-[#52525b]">
                Tap + Add on any B2C home repair or B2B shift crew to build an instant dispatch order.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex min-h-[40px] items-center rounded-lg bg-[#e23744] px-5 py-2 text-sm font-semibold text-white hover:bg-[#be123c] cursor-pointer"
              >
                Browse Services
              </button>
            </div>
          ) : (
            <form id="order-tray-form" onSubmit={handleCheckout} className="space-y-5">
              {/* Line Items */}
              <div className="divide-y divide-[#e4e4e7] rounded-2xl border border-[#e4e4e7] bg-white">
                {items.map(({ service, quantity }) => {
                  const nearest = itemDispatchMap.get(service.id);
                  return (
                    <div
                      key={service.id}
                      className="flex items-start justify-between gap-3 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-[#71717a]">
                          <span
                            className={
                              service.segment === 'B2B'
                                ? 'text-[#e23744]'
                                : 'text-[#059669]'
                            }
                          >
                            {service.segment}
                          </span>
                          {' · '}
                          {service.category} · {service.arrivalEta}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-[#18181b]">
                          {service.title}
                        </p>
                        {nearest && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                            <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              Routed to nearest: {nearest.pro.name} · {nearest.distanceKm.toFixed(1)} km · {nearest.etaMinutes} min
                            </span>
                          </p>
                        )}
                        <p className="mt-1 font-mono text-xs font-semibold text-[#52525b] tabular-nums">
                          ₹{service.flatPrice.toLocaleString('en-IN')} × {quantity} ={' '}
                          <span className="text-[#18181b]">
                            ₹{(service.flatPrice * quantity).toLocaleString('en-IN')}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="inline-flex items-center rounded-lg border border-[#e4e4e7] bg-[#fcfbfa]">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(service.id, -1)}
                            aria-label={`Decrease quantity for ${service.title}`}
                            className="flex h-8 w-8 items-center justify-center text-[#52525b] hover:text-[#e23744] cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[26px] text-center font-mono text-xs font-bold text-[#18181b] tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(service.id, 1)}
                            aria-label={`Increase quantity for ${service.title}`}
                            className="flex h-8 w-8 items-center justify-center text-[#52525b] hover:text-[#e23744] cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(service.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#71717a] hover:text-[#e23744] cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Hub & Address */}
              <div className="space-y-3 rounded-2xl border border-[#e4e4e7] bg-white p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="tray-city"
                      className="block text-xs font-semibold text-[#52525b]"
                    >
                      Metro Hub
                    </label>
                    <select
                      id="tray-city"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setCustomSiteCoords(null);
                        setGpsStatus('');
                      }}
                      className="mt-1 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-2.5 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
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
                      htmlFor="tray-slot"
                      className="block text-xs font-semibold text-[#52525b]"
                    >
                      Arrival / Shift Window
                    </label>
                    <select
                      id="tray-slot"
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-2.5 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
                    >
                      {ORDER_WINDOWS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="tray-address"
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
                    id="tray-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#e23744] focus:bg-white focus:outline-none"
                  />
                  {gpsStatus && (
                    <p className="mt-1 font-mono text-[11px] text-[#059669]">{gpsStatus}</p>
                  )}
                </div>

                {hasB2B && (
                  <div>
                    <label
                      htmlFor="tray-gstin"
                      className="block text-xs font-semibold text-[#52525b]"
                    >
                      Company GSTIN (Optional for B2B Tax Credit)
                    </label>
                    <input
                      id="tray-gstin"
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="29AABCU9603R1ZM"
                      className="mt-1 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 font-mono text-xs text-[#18181b] placeholder:text-[#71717a] focus:border-[#e23744] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Itemized Bill Summary */}
              <dl className="divide-y divide-[#e4e4e7] rounded-2xl border border-[#e4e4e7] bg-white px-4 py-1 text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[#52525b]">Services Subtotal</dt>
                  <dd className="font-mono font-semibold text-[#18181b] tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[#52525b]">Shift &amp; Service GST (5% Reduced Rate)</dt>
                  <dd className="font-mono font-semibold text-[#18181b] tabular-nums">
                    ₹{gstAmount.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="font-bold text-[#18181b]">Total Escrow Hold</dt>
                  <dd className="font-mono text-lg font-extrabold text-[#e23744] tabular-nums">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </dd>
                </div>
              </dl>

              {error && (
                <p className="text-xs font-semibold text-[#be123c]">{error}</p>
              )}
            </form>
          )}
        </div>

        {/* Sticky Footer Checkout CTA */}
        {items.length > 0 && (
          <div className="border-t border-[#e4e4e7] bg-white px-6 py-4">
            <div className="mb-3 flex items-center justify-between text-xs text-[#52525b]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#059669]" aria-hidden="true" />
                Released only after OTP sign-off
              </span>
              <button
                type="button"
                onClick={onClearCart}
                className="font-semibold text-[#71717a] hover:text-[#e23744] cursor-pointer"
              >
                Clear Tray
              </button>
            </div>
            <button
              type="submit"
              form="order-tray-form"
              className="flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#e23744] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#be123c] active:scale-[0.99] cursor-pointer"
            >
              Place Order &amp; Track Live · ₹{totalAmount.toLocaleString('en-IN')} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
