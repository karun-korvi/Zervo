import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { Check, Navigation, X } from 'lucide-react';
import {
  BookingRequestModal,
  BookingTarget,
} from './components/BookingRequestModal';
import { BookingsDispatchView } from './components/BookingsDispatchView';
import { EarningsWalletView } from './components/EarningsWalletView';
import { JobsExchangeView } from './components/JobsExchangeView';
import { Navbar } from './components/Navbar';
import { OrderCartDrawer } from './components/OrderCartDrawer';
import { ProsDirectoryView } from './components/ProsDirectoryView';
import { ServicesDiscoverView } from './components/ServicesDiscoverView';
import { WorkLiveTrackerView } from './components/WorkLiveTrackerView';
import {
  CITY_HUB_CENTERS,
  INITIAL_BOOKINGS,
  INITIAL_BUSINESS_REQUIREMENTS,
  INITIAL_LEDGER,
  INITIAL_SERVICES,
  INITIAL_SHIFTS,
  INITIAL_VERIFICATION_QUEUE,
  INITIAL_VERIFIED_PROS,
  ZEVRO_CITIES,
} from './data/zevroData';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  ensureUserProfile,
  saveBookingToFirestore,
  saveLedgerEntryToFirestore,
  saveRequirementToFirestore,
  saveWorkerProfileToFirestore,
  settleLedgerEntryInFirestore,
  subscribeUserBookings,
  subscribeUserLedger,
  subscribeUserRequirements,
  updateBookingDispatchInFirestore,
  updateBookingFeedbackInFirestore,
  updateBookingStageInFirestore,
  updateRequirementCheckInInFirestore,
} from './lib/firestoreSync';
import {
  buildZomatoArrivalMessage,
  RankedWorkerCandidate,
} from './lib/nearestWorkerDispatch';
import {
  BookingRecord,
  BusinessRequirement,
  DailyDemandMetric,
  DispatchStage,
  JobShift,
  LedgerEntry,
  LiveWorkTarget,
  OrderCartItem,
  ProfessionalCategory,
  ScreenId,
  ServiceCategory,
  ServiceOffering,
  VerificationQueueItem,
  VerifiedPro,
  WorkspaceMode,
} from './types/zevro';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const MAPS_LIBRARIES: ('routes' | 'marker')[] = ['routes', 'marker'];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('services');
  const [returnScreen, setReturnScreen] = useState<ScreenId>('services');
  const [mode, setMode] = useState<WorkspaceMode>('consumer');
  const [selectedCity, setSelectedCity] = useState<string>(ZEVRO_CITIES[0]);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const profileReadyUidRef = useRef<string | null>(null);
  const persistedBookingIdsRef = useRef<Set<string>>(new Set());
  const persistedLedgerIdsRef = useRef<Set<string>>(new Set());
  const persistedReqIdsRef = useRef<Set<string>>(new Set());

  const [shifts, setShifts] = useState<JobShift[]>(INITIAL_SHIFTS);
  const [pros, setPros] = useState<VerifiedPro[]>(INITIAL_VERIFIED_PROS);
  const [businessRequirements, setBusinessRequirements] = useState<BusinessRequirement[]>(
    INITIAL_BUSINESS_REQUIREMENTS
  );
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>(
    INITIAL_VERIFICATION_QUEUE
  );

  const [bookings, setBookings] = useState<BookingRecord[]>(INITIAL_BOOKINGS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(INITIAL_LEDGER);
  const [claimedShiftIds, setClaimedShiftIds] = useState<string[]>(['job-elec-209']);

  const [cartItems, setCartItems] = useState<OrderCartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);

  const [bookingTarget, setBookingTarget] = useState<BookingTarget | null>(null);
  const [liveTarget, setLiveTarget] = useState<LiveWorkTarget | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string>('');
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [serviceCategoryJump, setServiceCategoryJump] = useState<ServiceCategory | undefined>(undefined);
  const [proCategoryJump, setProCategoryJump] = useState<'All' | ProfessionalCategory>('All');
  const [openRegisterPrompt, setOpenRegisterPrompt] = useState<boolean>(false);

  const hasApiKey = Boolean(GOOGLE_MAPS_API_KEY);

  // Listen for Google Maps Platform Tier 1 & Tier 2 quota notifications
  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Listen for Firebase Auth state & sync Firestore subcollections
  useEffect(() => {
    let unsubBookings: (() => void) | null = null;
    let unsubLedger: (() => void) | null = null;
    let unsubReqs: (() => void) | null = null;
    let cancelled = false;

    const cleanupSubs = () => {
      unsubBookings?.();
      unsubLedger?.();
      unsubReqs?.();
      unsubBookings = null;
      unsubLedger = null;
      unsubReqs = null;
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      cleanupSubs();
      setAuthUser(user);

      if (!user) {
        profileReadyUidRef.current = null;
        persistedBookingIdsRef.current = new Set();
        persistedLedgerIdsRef.current = new Set();
        persistedReqIdsRef.current = new Set();
        setBookings(INITIAL_BOOKINGS);
        setLedger(INITIAL_LEDGER);
        setBusinessRequirements(INITIAL_BUSINESS_REQUIREMENTS);
        return;
      }

      try {
        await ensureUserProfile(user, ZEVRO_CITIES[0]);
        if (cancelled) return;
        profileReadyUidRef.current = user.uid;

        unsubBookings = subscribeUserBookings(user.uid, (rows) => {
          const ids = new Set(rows.map((r) => r.id));
          persistedBookingIdsRef.current = ids;
          setBookings([
            ...rows,
            ...INITIAL_BOOKINGS.filter((b) => !ids.has(b.id)),
          ]);
        });

        unsubLedger = subscribeUserLedger(user.uid, (rows) => {
          const ids = new Set(rows.map((r) => r.id));
          persistedLedgerIdsRef.current = ids;
          setLedger([
            ...rows,
            ...INITIAL_LEDGER.filter((l) => !ids.has(l.id)),
          ]);
        });

        unsubReqs = subscribeUserRequirements(user.uid, (rows) => {
          const ids = new Set(rows.map((r) => r.id));
          persistedReqIdsRef.current = ids;
          setBusinessRequirements([
            ...rows,
            ...INITIAL_BUSINESS_REQUIREMENTS.filter((r) => !ids.has(r.id)),
          ]);
        });
      } catch {
        // Structured error logged in handleFirestoreError; UI continues seamlessly
      }
    });

    return () => {
      cancelled = true;
      cleanupSubs();
      unsubAuth();
    };
  }, []);

  const ensureReadyUser = async (): Promise<User | null> => {
    const current = auth.currentUser;
    if (!current) return null;
    if (profileReadyUidRef.current !== current.uid) {
      await ensureUserProfile(current, selectedCity);
      profileReadyUidRef.current = current.uid;
    }
    return current;
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      await ensureUserProfile(cred.user, selectedCity);
      profileReadyUidRef.current = cred.user.uid;
      setBannerMessage(
        `Signed in as ${cred.user.displayName ?? cred.user.email} — bookings, shifts & payouts now sync to cloud.`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in cancelled.';
      if (!msg.includes('popup-closed-by-user')) {
        setBannerMessage('Google sign-in could not complete. Please allow popups and try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setBannerMessage('Signed out. Viewing local marketplace mode.');
    } finally {
      setAuthLoading(false);
    }
  };

  const availableBalance = useMemo(() => {
    const settled = ledger
      .filter((l) => l.status === 'Settled')
      .reduce((sum, l) => sum + l.netAmount, 0);
    const withdrawn = ledger
      .filter((l) => l.status === 'Withdrawn')
      .reduce((sum, l) => sum + l.netAmount, 0);
    return Math.max(0, settled - withdrawn);
  }, [ledger]);

  const escrowBalance = useMemo(() => {
    return ledger
      .filter((l) => l.status === 'In Escrow')
      .reduce((sum, l) => sum + l.netAmount, 0);
  }, [ledger]);

  const activeBookingCount = useMemo(
    () => bookings.filter((b) => b.status === 'Active').length,
    [bookings]
  );

  const primaryActiveBooking = useMemo(
    () => bookings.find((b) => b.status === 'Active'),
    [bookings]
  );

  // Keep booking target synchronized with live bookings state
  const resolvedLiveTarget = useMemo<LiveWorkTarget | null>(() => {
    if (!liveTarget) return null;
    if (liveTarget.type === 'booking') {
      const updated = bookings.find((b) => b.id === liveTarget.booking.id);
      return updated ? { type: 'booking', booking: updated } : liveTarget;
    }
    return liveTarget;
  }, [liveTarget, bookings]);

  const handleNavigate = (
    screen: ScreenId,
    opts?: {
      mode?: WorkspaceMode;
      category?: ServiceCategory;
      proCategory?: ProfessionalCategory | 'All';
      openRegister?: boolean;
    }
  ) => {
    if (opts?.mode) setMode(opts.mode);
    if (opts?.category) setServiceCategoryJump(opts.category);
    if (opts?.proCategory) setProCategoryJump(opts.proCategory);
    if (opts?.openRegister) setOpenRegisterPrompt(true);
    setActiveScreen(screen);
    if (screen !== 'track') {
      setReturnScreen(screen);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLiveWork = (target: LiveWorkTarget) => {
    if (activeScreen !== 'track') {
      setReturnScreen(activeScreen);
    }
    setLiveTarget(target);
    setActiveScreen('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDemandWork = (metric: DailyDemandMetric) => {
    const preferShift = mode === 'pro' || activeScreen === 'jobs';
    if (preferShift) {
      const shift = shifts.find((s) => s.id === metric.linkedShiftId);
      if (shift) {
        handleOpenLiveWork({ type: 'shift', shift });
        return;
      }
    }
    const service = INITIAL_SERVICES.find((s) => s.id === metric.linkedServiceId);
    if (service) {
      handleOpenLiveWork({ type: 'service', service });
    }
  };

  const handleAddToCart = (service: ServiceOffering) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (serviceId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.service.id === serviceId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (serviceId: string) => {
    setCartItems((prev) => prev.filter((item) => item.service.id !== serviceId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handlePlaceCartOrder = (createdBookings: BookingRecord[]) => {
    if (createdBookings.length === 0) return;
    setBookings((prev) => [...createdBookings, ...prev]);
    setCartItems([]);
    setCartDrawerOpen(false);
    setLiveTarget({ type: 'booking', booking: createdBookings[0] });
    setReturnScreen('bookings');
    setActiveScreen('track');
    setBannerMessage(
      createdBookings.length === 1
        ? `Order ${createdBookings[0].id} placed (${createdBookings[0].title}) — live GPS dispatch active.`
        : `${createdBookings.length} service orders placed (${createdBookings[0].id} and more) — live GPS dispatch active.`
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        await Promise.all(
          createdBookings.map((b) => saveBookingToFirestore(user.uid, b))
        );
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleBookService = (service: ServiceOffering) => {
    setBookingTarget({ type: 'service', service });
  };

  const handleBookPro = (pro: VerifiedPro) => {
    setBookingTarget({ type: 'pro', pro });
  };

  const handleConfirmBooking = (newBooking: BookingRecord) => {
    setBookings((prev) => [newBooking, ...prev]);
    setBookingTarget(null);
    setLiveTarget({ type: 'booking', booking: newBooking });
    setReturnScreen('bookings');
    setActiveScreen('track');
    setBannerMessage(
      `Confirmed ${newBooking.id}: ${newBooking.title} (${newBooking.scheduledSlot}) — live GPS line active.`
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        await saveBookingToFirestore(user.uid, newBooking);
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleClaimShift = (shift: JobShift) => {
    if (claimedShiftIds.includes(shift.id)) {
      handleNavigate('bookings');
      return;
    }

    const hubFallback =
      CITY_HUB_CENTERS[shift.city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];

    const newBooking: BookingRecord = {
      id: `ZVR-${Math.floor(8600 + Math.random() * 1200)}`,
      kind: 'claimed_shift',
      segment: shift.segment,
      title: shift.title,
      counterpartyName: shift.employer,
      counterpartyMeta: 'Guaranteed Payout · Escrow Locked',
      city: shift.city,
      address: shift.locality,
      scheduledSlot: `${shift.shiftDate} · ${shift.shiftBucket} (${shift.shiftWindow})`,
      amount: shift.totalPayout,
      gstOrFee: 0,
      totalAmount: shift.totalPayout,
      stage: 0,
      status: 'Active',
      escrowCode: `ESC-${Math.floor(1000 + Math.random() * 8999)}-SHF`,
      notes: shift.brief,
      hubCoords: shift.hubCoords ?? hubFallback.hub,
      siteCoords: shift.siteCoords ?? hubFallback.defaultSite,
      distanceKm: shift.distanceKm,
      etaMinutes: shift.etaMinutes,
      imageUrl: shift.imageUrl,
    };

    const newEscrowEntry: LedgerEntry = {
      id: `PAY-${Math.floor(4500 + Math.random() * 400)}`,
      date: 'Nov 15, 2026',
      description: shift.title,
      zone: shift.locality.split(',')[0],
      durationLabel: `${shift.durationHours}h 00m`,
      grossAmount: shift.totalPayout,
      platformFee: 0,
      netAmount: shift.totalPayout,
      status: 'In Escrow',
    };

    setClaimedShiftIds((prev) => [...prev, shift.id]);
    setBookings((prev) => [newBooking, ...prev]);
    setLedger((prev) => [newEscrowEntry, ...prev]);
    setBannerMessage(
      `Shift claimed (${shift.shiftDate}, ${shift.shiftBucket}): ₹${shift.totalPayout.toLocaleString('en-IN')} locked in ZEVRO Escrow.`
    );

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        await Promise.all([
          saveBookingToFirestore(user.uid, newBooking),
          saveLedgerEntryToFirestore(user.uid, newEscrowEntry),
        ]);
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleAdvanceStage = (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking || targetBooking.status !== 'Active') return;

    const nextStage = Math.min(3, targetBooking.stage + 1) as DispatchStage;
    const nextStatus = nextStage === 3 ? 'Completed' : 'Active';

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              stage: nextStage,
              status: nextStatus,
            }
          : b
      )
    );

    let matchedLedgerEntry: LedgerEntry | undefined;
    if (nextStage === 3 && targetBooking.kind === 'claimed_shift') {
      matchedLedgerEntry = ledger.find(
        (entry) =>
          entry.description === targetBooking.title && entry.status === 'In Escrow'
      );
      setLedger((prev) =>
        prev.map((entry) =>
          entry.description === targetBooking.title && entry.status === 'In Escrow'
            ? { ...entry, status: 'Settled' }
            : entry
        )
      );
      setBannerMessage(
        `OTP verified on ${targetBooking.id}: ₹${targetBooking.totalAmount.toLocaleString('en-IN')} released to your Available Payout balance.`
      );
    } else if (nextStage === 3) {
      setBannerMessage(
        `Service ${targetBooking.id} completed and escrow settled.`
      );
    }

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedBookingIdsRef.current.has(bookingId)) {
          await updateBookingStageInFirestore(user.uid, bookingId, nextStage, nextStatus);
        } else {
          await saveBookingToFirestore(user.uid, {
            ...targetBooking,
            stage: nextStage,
            status: nextStatus,
          });
        }
        if (matchedLedgerEntry) {
          if (persistedLedgerIdsRef.current.has(matchedLedgerEntry.id)) {
            await settleLedgerEntryInFirestore(user.uid, matchedLedgerEntry.id);
          } else {
            await saveLedgerEntryToFirestore(user.uid, {
              ...matchedLedgerEntry,
              status: 'Settled',
            });
          }
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleAcceptNearestDispatch = (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking || targetBooking.status !== 'Active') return;
    const nextStage = Math.max(1, targetBooking.stage) as DispatchStage;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              dispatchStatus: 'Accepted',
              stage: nextStage,
            }
          : b
      )
    );
    setBannerMessage(
      `${targetBooking.counterpartyName} accepted order ${targetBooking.id} — live route line running.`
    );

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedBookingIdsRef.current.has(bookingId)) {
          await updateBookingDispatchInFirestore(user.uid, bookingId, {
            dispatchStatus: 'Accepted',
            stage: nextStage,
          });
        } else {
          await saveBookingToFirestore(user.uid, {
            ...targetBooking,
            dispatchStatus: 'Accepted',
            stage: nextStage,
          });
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleReassignNextWorker = (
    bookingId: string,
    candidate: RankedWorkerCandidate
  ) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking || targetBooking.status !== 'Active') return;

    const nextName =
      targetBooking.headcount && targetBooking.headcount > 1
        ? `${candidate.pro.name} (Lead · ${targetBooking.headcount} Crew)`
        : candidate.pro.name;
    const nextMeta = `${candidate.pro.specialtyTitle} · ${candidate.distanceKm.toFixed(1)} km · ${candidate.pro.rating.toFixed(2)}★`;

    const updatedBooking: BookingRecord = {
      ...targetBooking,
      assignedWorkerId: candidate.pro.id,
      dispatchStatus: 'Fallback Reassigned',
      counterpartyName: nextName,
      counterpartyMeta: nextMeta,
      hubCoords: candidate.pro.currentCoords,
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
      stage: 1,
    };

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? updatedBooking : b))
    );
    setBannerMessage(
      `Order ${bookingId} rerouted to #${candidate.rank} nearest ${candidate.pro.name} (${candidate.distanceKm.toFixed(1)} km · ${candidate.etaMinutes} min ETA).`
    );

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedBookingIdsRef.current.has(bookingId)) {
          await updateBookingDispatchInFirestore(user.uid, bookingId, {
            assignedWorkerId: candidate.pro.id,
            dispatchStatus: 'Fallback Reassigned',
            counterpartyName: nextName,
            counterpartyMeta: nextMeta,
            distanceKm: candidate.distanceKm,
            etaMinutes: candidate.etaMinutes,
            hubCoords: candidate.pro.currentCoords,
            stage: 1,
          });
        } else {
          await saveBookingToFirestore(user.uid, updatedBooking);
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleCancelBooking = (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'Cancelled' } : b
      )
    );
    setBannerMessage(`Booking ${bookingId} cancelled and escrow hold voided.`);

    if (!targetBooking) return;
    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedBookingIdsRef.current.has(bookingId)) {
          await updateBookingStageInFirestore(
            user.uid,
            bookingId,
            targetBooking.stage,
            'Cancelled'
          );
        } else {
          await saveBookingToFirestore(user.uid, {
            ...targetBooking,
            status: 'Cancelled',
          });
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleWithdraw = (amount: number, destination: string) => {
    const withdrawalEntry: LedgerEntry = {
      id: `PAY-${Math.floor(4900 + Math.random() * 900)}`,
      date: 'Nov 15, 2026',
      description: `Instant Payout — ${destination}`,
      zone: 'UPI / IMPS',
      durationLabel: 'Instant',
      grossAmount: amount,
      platformFee: 0,
      netAmount: amount,
      status: 'Withdrawn',
    };
    setLedger((prev) => [withdrawalEntry, ...prev]);

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        await saveLedgerEntryToFirestore(user.uid, withdrawalEntry);
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
  };

  const handleCreateBusinessRequirement = (
    req: BusinessRequirement,
    linkedShift: JobShift
  ) => {
    setBusinessRequirements((prev) => [req, ...prev]);
    setShifts((prev) => [linkedShift, ...prev]);
    setBannerMessage(
      `Published ${req.id}: ${req.workersRequested} ${req.roleTitle} slots now open on the Worker Shift Board.`
    );

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        await saveRequirementToFirestore(user.uid, req);
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleCheckInWorkers = (reqId: string, delta: number) => {
    const currentReq = businessRequirements.find((r) => r.id === reqId);
    if (!currentReq) return;
    const nextCheckedIn = Math.min(
      currentReq.workersRequested,
      Math.max(0, currentReq.workersCheckedIn + delta)
    );
    const updatedReq: BusinessRequirement = {
      ...currentReq,
      workersCheckedIn: nextCheckedIn,
      workersConfirmed: Math.max(currentReq.workersConfirmed, nextCheckedIn),
      status: nextCheckedIn > 0 ? 'Shift Active' : currentReq.status,
    };

    setBusinessRequirements((prev) =>
      prev.map((req) => (req.id === reqId ? updatedReq : req))
    );

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedReqIdsRef.current.has(reqId)) {
          await updateRequirementCheckInInFirestore(user.uid, updatedReq);
        } else {
          await saveRequirementToFirestore(user.uid, updatedReq);
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleResolveVerification = (
    verId: string,
    nextStatus: 'Approved' | 'Flagged'
  ) => {
    setVerificationQueue((prev) =>
      prev.map((item) => (item.id === verId ? { ...item, status: nextStatus } : item))
    );
    setBannerMessage(`Verification item ${verId} marked as ${nextStatus}.`);
  };

  const handleSubmitBookingFeedback = (
    bookingId: string,
    rating: number,
    reviewText: string
  ) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, rating, reviewText } : b
      )
    );
    setBannerMessage(`Thank you! ${rating}.0★ review recorded for ${bookingId}.`);

    if (!targetBooking) return;
    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedBookingIdsRef.current.has(bookingId)) {
          await updateBookingFeedbackInFirestore(user.uid, bookingId, {
            rating,
            reviewText,
          });
        } else {
          await saveBookingToFirestore(user.uid, {
            ...targetBooking,
            rating,
            reviewText,
          });
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleRaiseSupportTicket = (bookingId: string, ticketText: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    const ticketId = `SUP-${Math.floor(2100 + Math.random() * 7000)}`;
    const ticketStr = `${ticketId} — ${ticketText}`;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, supportTicket: ticketStr } : b
      )
    );
    setVerificationQueue((prev) => [
      {
        id: ticketId,
        applicantName: `Order #${bookingId} · Customer Issue`,
        accountType: 'Support Dispute',
        detail: ticketText,
        city: selectedCity,
        submittedAt: 'Just now',
        status: 'Pending',
      },
      ...prev,
    ]);
    setBannerMessage(`Support ticket ${ticketId} queued for ZEVRO Ops review.`);

    if (!targetBooking) return;
    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        if (persistedBookingIdsRef.current.has(bookingId)) {
          await updateBookingFeedbackInFirestore(user.uid, bookingId, {
            supportTicket: ticketStr,
          });
        } else {
          await saveBookingToFirestore(user.uid, {
            ...targetBooking,
            supportTicket: ticketStr,
          });
        }
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const handleRegisterWorker = (
    newPro: VerifiedPro,
    accountRole: 'Worker' | 'Partner' = 'Worker'
  ) => {
    setPros((prev) => [newPro, ...prev]);
    setVerificationQueue((prev) => [
      {
        id: `VER-${Math.floor(910 + Math.random() * 80)}`,
        applicantName: `${newPro.name} (${newPro.primaryTrade})`,
        accountType: accountRole,
        detail: `${newPro.yearsExperience} yrs experience · ${newPro.availability} · ${newPro.workPreference}`,
        city: newPro.city,
        submittedAt: 'Just now',
        status: 'Pending',
      },
      ...prev,
    ]);
    setBannerMessage(
      `Welcome ${newPro.name}! Your ${accountRole.toLowerCase()} profile is live and queued for verification.`
    );

    void (async () => {
      try {
        const user = await ensureReadyUser();
        if (!user) return;
        await saveWorkerProfileToFirestore(user.uid, newPro, accountRole);
      } catch {
        // Logged in firestoreSync
      }
    })();
  };

  const appShell = (
    <div className="flex min-h-screen flex-col bg-[#fcfbfa] text-[#18181b]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[#e23744] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        activeScreen={activeScreen === 'track' ? returnScreen : activeScreen}
        onNavigate={handleNavigate}
        onOpenPostModal={() => setBookingTarget({ type: 'custom' })}
        activeBookingCount={activeBookingCount}
        authUser={authUser}
        authLoading={authLoading}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />

      {bannerMessage && (
        <div className="border-b border-[#a7f3d0] bg-[#ecfdf5]">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5 text-xs font-semibold text-[#047857] sm:px-6 lg:px-8">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{bannerMessage}</span>
            </span>
            <div className="flex items-center gap-3 shrink-0">
              {activeScreen !== 'bookings' && (
                <button
                  type="button"
                  onClick={() => handleNavigate('bookings')}
                  className="underline underline-offset-4 hover:text-[#18181b] cursor-pointer"
                >
                  View Bookings
                </button>
              )}
              <button
                type="button"
                onClick={() => setBannerMessage('')}
                aria-label="Dismiss notification"
                className="rounded p-0.5 hover:bg-[#d1fae5] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {primaryActiveBooking && activeScreen !== 'track' && (
        <div className="border-b border-[#e4e4e7] bg-white">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5 text-[#18181b]">
              <Navigation className="h-3.5 w-3.5 text-[#059669] shrink-0" aria-hidden="true" />
              <span className="font-mono font-bold text-[#e23744] shrink-0">
                {primaryActiveBooking.id}
              </span>
              <span className="truncate font-semibold">
                {buildZomatoArrivalMessage({
                  workerName: primaryActiveBooking.counterpartyName,
                  distanceKm: primaryActiveBooking.distanceKm ?? 2.4,
                  etaMinutes: primaryActiveBooking.etaMinutes ?? 12,
                  progress:
                    primaryActiveBooking.stage === 2
                      ? 0.96
                      : primaryActiveBooking.stage === 1
                      ? 0.45
                      : 0.1,
                  dispatchStatus: primaryActiveBooking.dispatchStatus,
                  stage: primaryActiveBooking.stage,
                  status: primaryActiveBooking.status,
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                handleOpenLiveWork({ type: 'booking', booking: primaryActiveBooking })
              }
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#059669] px-3 py-1 text-xs font-semibold text-white hover:bg-[#047857] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Track Live Location →</span>
            </button>
          </div>
        </div>
      )}

      <main id="main-content" className="flex-1">
        {activeScreen === 'services' && (
          <ServicesDiscoverView
            hasApiKey={hasApiKey}
            mode={mode}
            onModeChange={handleModeChange}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            services={INITIAL_SERVICES}
            shifts={shifts}
            claimedShiftIds={claimedShiftIds}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onOpenCartDrawer={() => setCartDrawerOpen(true)}
            onBookService={handleBookService}
            onClaimShift={handleClaimShift}
            onOpenLiveWork={handleOpenLiveWork}
            onOpenDemandWork={handleOpenDemandWork}
            onNavigate={handleNavigate}
            externalCategoryFilter={serviceCategoryJump}
            businessRequirements={businessRequirements}
            verificationQueue={verificationQueue}
            onCreateBusinessRequirement={handleCreateBusinessRequirement}
            onCheckInWorkers={handleCheckInWorkers}
            onResolveVerification={handleResolveVerification}
          />
        )}

        {activeScreen === 'jobs' && (
          <JobsExchangeView
            hasApiKey={hasApiKey}
            shifts={shifts}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            claimedShiftIds={claimedShiftIds}
            onClaimShift={handleClaimShift}
            onOpenLiveWork={handleOpenLiveWork}
            onOpenDemandWork={handleOpenDemandWork}
            onNavigate={handleNavigate}
          />
        )}

        {activeScreen === 'bookings' && (
          <BookingsDispatchView
            hasApiKey={hasApiKey}
            bookings={bookings}
            onAdvanceStage={handleAdvanceStage}
            onCancelBooking={handleCancelBooking}
            onSubmitFeedback={handleSubmitBookingFeedback}
            onRaiseSupportTicket={handleRaiseSupportTicket}
            onOpenLiveWork={handleOpenLiveWork}
            onNavigate={handleNavigate}
          />
        )}

        {activeScreen === 'earnings' && (
          <EarningsWalletView
            ledger={ledger}
            availableBalance={availableBalance}
            escrowBalance={escrowBalance}
            onWithdraw={handleWithdraw}
          />
        )}

        {activeScreen === 'pros' && (
          <ProsDirectoryView
            pros={pros}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onBookPro={handleBookPro}
            onConfirmAppointment={handleConfirmBooking}
            onRegisterWorker={handleRegisterWorker}
            initialProCategory={proCategoryJump}
            openRegisterOnMount={openRegisterPrompt}
            onResetRegisterPrompt={() => setOpenRegisterPrompt(false)}
          />
        )}

        {activeScreen === 'track' && resolvedLiveTarget && (
          <WorkLiveTrackerView
            hasApiKey={hasApiKey}
            target={resolvedLiveTarget}
            returnScreen={returnScreen}
            claimedShiftIds={claimedShiftIds}
            allServices={INITIAL_SERVICES}
            allShifts={shifts}
            allBookings={bookings}
            allPros={pros}
            onBack={() => handleNavigate(returnScreen)}
            onSelectTarget={(next) => setLiveTarget(next)}
            onBookService={handleBookService}
            onClaimShift={handleClaimShift}
            onAdvanceStage={handleAdvanceStage}
            onAcceptDispatch={handleAcceptNearestDispatch}
            onReassignWorker={handleReassignNextWorker}
          />
        )}
      </main>

      {/* Complete ZEVRO Section Directory Footer */}
      <footer className="mt-16 border-t border-[#e4e4e7] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-md">
            <p className="font-display text-lg font-extrabold tracking-[-0.04em] text-[#e23744]">
              ZEVRO
            </p>
            <p className="mt-1.5 text-xs font-semibold text-[#18181b]">
              One Platform for Every Service. Every Skill. Every Opportunity.
            </p>
            <p className="mt-1 text-xs text-[#71717a]">
              ZEVRO Services · ZEVRO Workforce · ZEVRO Earn · Bengaluru Launch Hub &amp; Pan-India Metro Corridors
            </p>
          </div>

          <nav aria-label="Footer Navigation" className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-semibold text-[#52525b] sm:grid-cols-4">
            <button type="button" onClick={() => handleNavigate('services', { mode: 'consumer', category: 'All' })} className="text-left hover:text-[#e23744] cursor-pointer">
              Home &amp; Book a Service
            </button>
            <button type="button" onClick={() => handleNavigate('pros', { proCategory: 'Doctor' })} className="text-left hover:text-[#e23744] cursor-pointer">
              Book a Doctor
            </button>
            <button type="button" onClick={() => handleNavigate('pros', { proCategory: 'Teacher' })} className="text-left hover:text-[#e23744] cursor-pointer">
              Find a Teacher
            </button>
            <button type="button" onClick={() => handleNavigate('pros', { proCategory: 'All' })} className="text-left hover:text-[#e23744] cursor-pointer">
              Book a Professional
            </button>
            <button type="button" onClick={() => handleNavigate('jobs')} className="text-left hover:text-[#059669] cursor-pointer">
              Find Work (12 Job Types)
            </button>
            <button type="button" onClick={() => handleNavigate('services', { mode: 'business' })} className="text-left hover:text-[#e23744] cursor-pointer">
              Hire Workers &amp; Business Solutions
            </button>
            <button type="button" onClick={() => handleNavigate('pros', { openRegister: true })} className="text-left hover:text-[#059669] cursor-pointer">
              Become a Partner / Worker
            </button>
            <button type="button" onClick={() => handleNavigate('bookings')} className="text-left hover:text-[#e23744] cursor-pointer">
              Help, Support &amp; Bookings
            </button>
          </nav>
        </div>
      </footer>

      {cartDrawerOpen && (
        <OrderCartDrawer
          items={cartItems}
          pros={pros}
          defaultCity={selectedCity}
          onUpdateQty={handleUpdateCartQty}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
          onClose={() => setCartDrawerOpen(false)}
          onPlaceOrder={handlePlaceCartOrder}
        />
      )}

      {bookingTarget && (
        <BookingRequestModal
          target={bookingTarget}
          pros={pros}
          defaultCity={selectedCity}
          onClose={() => setBookingTarget(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );

  if (hasApiKey) {
    return (
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={MAPS_LIBRARIES}
        language="en"
        region="IN"
      >
        {appShell}
      </APIProvider>
    );
  }

  return appShell;
}
