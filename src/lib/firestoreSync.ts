import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CITY_HUB_CENTERS, HERO_DISPATCH_IMAGE } from '../data/zevroData';
import {
  BookingRecord,
  BusinessRequirement,
  DispatchStage,
  LedgerEntry,
  VerifiedPro,
} from '../types/zevro';
import { db, handleFirestoreError, OperationType } from './firebase';

const clip = (val: string | undefined, max: number, fallback = ''): string => {
  const raw = (val ?? fallback).trim();
  return raw.length > max ? raw.slice(0, max) : raw;
};

const safeId = (val: string): string => val.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);

export async function ensureUserProfile(user: User, preferredCity: string): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: clip(user.email ?? 'member@zevro.in', 254),
        displayName: clip(user.displayName ?? 'ZEVRO Member', 120, 'ZEVRO Member'),
        preferredCity: clip(preferredCity, 80, 'Bengaluru · Indiranagar'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: clip(user.displayName ?? 'ZEVRO Member', 120, 'ZEVRO Member'),
        preferredCity: clip(preferredCity, 80, 'Bengaluru · Indiranagar'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBookingToFirestore(
  userId: string,
  booking: BookingRecord
): Promise<void> {
  const bookingId = safeId(booking.id);
  const path = `users/${userId}/bookings/${bookingId}`;
  const ref = doc(db, 'users', userId, 'bookings', bookingId);
  const payload: Record<string, unknown> = {
    id: bookingId,
    userId,
    kind: booking.kind,
    segment: booking.segment ?? 'B2C',
    title: clip(booking.title, 180, 'ZEVRO Service'),
    counterpartyName: clip(booking.counterpartyName, 140, 'Verified Pro'),
    counterpartyMeta: clip(booking.counterpartyMeta, 160, 'Escrow Protected'),
    city: clip(booking.city, 80, 'Bengaluru · Indiranagar'),
    address: clip(booking.address, 240, 'Bengaluru Hub'),
    scheduledSlot: clip(booking.scheduledSlot, 120, 'Today'),
    amount: Math.max(0, Math.round(booking.amount)),
    gstOrFee: Math.max(0, Math.round(booking.gstOrFee)),
    totalAmount: Math.max(0, Math.round(booking.totalAmount)),
    stage: Math.min(3, Math.max(0, Math.round(booking.stage))),
    status: booking.status,
    escrowCode: clip(booking.escrowCode, 40, 'ESC-1001-ZVR'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (booking.headcount && booking.headcount >= 1) {
    payload.headcount = Math.min(500, Math.round(booking.headcount));
  }
  if (booking.gstin) {
    payload.gstin = clip(booking.gstin, 20);
  }
  if (booking.notes) {
    payload.notes = clip(booking.notes, 500);
  }
  if (booking.serviceCategory) {
    payload.serviceCategory = clip(booking.serviceCategory, 80);
  }
  if (booking.assignedWorkerId) {
    payload.assignedWorkerId = safeId(booking.assignedWorkerId);
  }
  if (booking.dispatchStatus) {
    payload.dispatchStatus = booking.dispatchStatus;
  }
  if (typeof booking.distanceKm === 'number') {
    payload.distanceKm = Number(booking.distanceKm.toFixed(2));
  }
  if (typeof booking.etaMinutes === 'number') {
    payload.etaMinutes = Math.max(0, Math.round(booking.etaMinutes));
  }
  if (booking.hubCoords) {
    payload.hubLat = booking.hubCoords.lat;
    payload.hubLng = booking.hubCoords.lng;
  }
  if (booking.siteCoords) {
    payload.siteLat = booking.siteCoords.lat;
    payload.siteLng = booking.siteCoords.lng;
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBookingStageInFirestore(
  userId: string,
  bookingId: string,
  stage: DispatchStage,
  status: 'Active' | 'Completed' | 'Cancelled'
): Promise<void> {
  const safeBookingId = safeId(bookingId);
  const path = `users/${userId}/bookings/${safeBookingId}`;
  const ref = doc(db, 'users', userId, 'bookings', safeBookingId);
  try {
    await updateDoc(ref, {
      stage,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookingDispatchInFirestore(
  userId: string,
  bookingId: string,
  updates: {
    assignedWorkerId?: string;
    dispatchStatus: 'Pinging Nearest' | 'Accepted' | 'Fallback Reassigned';
    counterpartyName?: string;
    counterpartyMeta?: string;
    distanceKm?: number;
    etaMinutes?: number;
    hubCoords?: { lat: number; lng: number };
    stage: DispatchStage;
  }
): Promise<void> {
  const safeBookingId = safeId(bookingId);
  const path = `users/${userId}/bookings/${safeBookingId}`;
  const ref = doc(db, 'users', userId, 'bookings', safeBookingId);
  const payload: Record<string, unknown> = {
    dispatchStatus: updates.dispatchStatus,
    stage: Math.min(1, Math.max(0, Math.round(updates.stage))),
    updatedAt: serverTimestamp(),
  };
  if (updates.assignedWorkerId) {
    payload.assignedWorkerId = safeId(updates.assignedWorkerId);
  }
  if (updates.counterpartyName) {
    payload.counterpartyName = clip(updates.counterpartyName, 140);
  }
  if (updates.counterpartyMeta) {
    payload.counterpartyMeta = clip(updates.counterpartyMeta, 160);
  }
  if (typeof updates.distanceKm === 'number') {
    payload.distanceKm = Number(updates.distanceKm.toFixed(2));
  }
  if (typeof updates.etaMinutes === 'number') {
    payload.etaMinutes = Math.max(0, Math.round(updates.etaMinutes));
  }
  if (updates.hubCoords) {
    payload.hubLat = updates.hubCoords.lat;
    payload.hubLng = updates.hubCoords.lng;
  }
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookingFeedbackInFirestore(
  userId: string,
  bookingId: string,
  updates: { rating?: number; reviewText?: string; supportTicket?: string }
): Promise<void> {
  const safeBookingId = safeId(bookingId);
  const path = `users/${userId}/bookings/${safeBookingId}`;
  const ref = doc(db, 'users', userId, 'bookings', safeBookingId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (typeof updates.rating === 'number') {
    payload.rating = Math.min(5, Math.max(1, Math.round(updates.rating)));
  }
  if (updates.reviewText !== undefined) {
    payload.reviewText = clip(updates.reviewText, 400);
  }
  if (updates.supportTicket !== undefined) {
    payload.supportTicket = clip(updates.supportTicket, 300);
  }
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveLedgerEntryToFirestore(
  userId: string,
  entry: LedgerEntry
): Promise<void> {
  const entryId = safeId(entry.id);
  const path = `users/${userId}/ledger/${entryId}`;
  const ref = doc(db, 'users', userId, 'ledger', entryId);
  try {
    await setDoc(ref, {
      id: entryId,
      userId,
      date: clip(entry.date, 40, 'Nov 15, 2026'),
      description: clip(entry.description, 180, 'ZEVRO Shift'),
      zone: clip(entry.zone, 80, 'Bengaluru'),
      durationLabel: clip(entry.durationLabel, 40, '8h 00m'),
      grossAmount: Math.max(0, Math.round(entry.grossAmount)),
      platformFee: Math.max(0, Math.round(entry.platformFee)),
      netAmount: Math.max(0, Math.round(entry.netAmount)),
      status: entry.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function settleLedgerEntryInFirestore(
  userId: string,
  entryId: string
): Promise<void> {
  const safeEntryId = safeId(entryId);
  const path = `users/${userId}/ledger/${safeEntryId}`;
  const ref = doc(db, 'users', userId, 'ledger', safeEntryId);
  try {
    await updateDoc(ref, {
      status: 'Settled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveRequirementToFirestore(
  userId: string,
  req: BusinessRequirement
): Promise<void> {
  const reqId = safeId(req.id);
  const path = `users/${userId}/requirements/${reqId}`;
  const ref = doc(db, 'users', userId, 'requirements', reqId);
  try {
    await setDoc(ref, {
      id: reqId,
      userId,
      companyName: clip(req.companyName, 140, 'Enterprise Site'),
      industry: clip(req.industry, 80, 'Warehouse & E-commerce'),
      roleTitle: clip(req.roleTitle, 140, 'Shift Crew'),
      city: clip(req.city, 80, 'Bengaluru · Indiranagar'),
      workersRequested: Math.min(500, Math.max(1, Math.round(req.workersRequested))),
      workersConfirmed: Math.min(req.workersRequested, Math.max(0, Math.round(req.workersConfirmed))),
      workersCheckedIn: Math.min(req.workersRequested, Math.max(0, Math.round(req.workersCheckedIn))),
      workFormat: clip(req.workFormat, 60, 'Daily Jobs'),
      shiftWindow: clip(req.shiftWindow, 120, 'Today · 9:00 AM – 5:00 PM'),
      payoutPerWorker: Math.max(100, Math.round(req.payoutPerWorker)),
      status: req.status,
      gstInvoiceId: clip(req.gstInvoiceId, 40, 'INV-2026-9000'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRequirementCheckInInFirestore(
  userId: string,
  req: BusinessRequirement
): Promise<void> {
  const reqId = safeId(req.id);
  const path = `users/${userId}/requirements/${reqId}`;
  const ref = doc(db, 'users', userId, 'requirements', reqId);
  try {
    await updateDoc(ref, {
      workersCheckedIn: req.workersCheckedIn,
      workersConfirmed: req.workersConfirmed,
      status: req.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveWorkerProfileToFirestore(
  userId: string,
  pro: VerifiedPro,
  accountRole: 'Worker' | 'Partner'
): Promise<void> {
  const profileId = safeId(pro.id);
  const path = `users/${userId}/workerProfiles/${profileId}`;
  const ref = doc(db, 'users', userId, 'workerProfiles', profileId);
  const payload: Record<string, unknown> = {
    id: profileId,
    userId,
    accountRole,
    name: clip(pro.name, 120, 'ZEVRO Member'),
    initials: clip(pro.initials, 6, 'ZM'),
    segment: pro.segment,
    primaryTrade: clip(pro.primaryTrade, 80, 'Home Services'),
    city: clip(pro.city, 80, 'Bengaluru · Indiranagar'),
    locality: clip(pro.locality, 120, 'City Hub'),
    yearsExperience: Math.min(60, Math.max(0, Math.round(pro.yearsExperience))),
    hourlyRate: Math.max(100, Math.round(pro.hourlyRate)),
    flatVisitFee: Math.max(0, Math.round(pro.flatVisitFee)),
    availability: pro.availability,
    workPreference: pro.workPreference,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (pro.registrationNumber) {
    payload.registrationNumber = clip(pro.registrationNumber, 60);
  }
  if (pro.bio) {
    payload.bio = clip(pro.bio, 400);
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserBookings(
  userId: string,
  onData: (rows: BookingRecord[]) => void
): () => void {
  const path = `users/${userId}/bookings`;
  const q = query(
    collection(db, 'users', userId, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const mapped: BookingRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        const city = String(data.city ?? 'Bengaluru · Indiranagar');
        const fallbackCity =
          CITY_HUB_CENTERS[city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];
        return {
          id: String(data.id),
          kind: data.kind,
          segment: data.segment,
          title: String(data.title),
          counterpartyName: String(data.counterpartyName),
          counterpartyMeta: String(data.counterpartyMeta),
          city,
          address: String(data.address),
          scheduledSlot: String(data.scheduledSlot),
          headcount: typeof data.headcount === 'number' ? data.headcount : undefined,
          gstin: typeof data.gstin === 'string' ? data.gstin : undefined,
          amount: Number(data.amount ?? 0),
          gstOrFee: Number(data.gstOrFee ?? 0),
          totalAmount: Number(data.totalAmount ?? 0),
          stage: (Number(data.stage ?? 0) as DispatchStage),
          status: data.status,
          escrowCode: String(data.escrowCode),
          notes: typeof data.notes === 'string' ? data.notes : undefined,
          rating: typeof data.rating === 'number' ? data.rating : undefined,
          reviewText: typeof data.reviewText === 'string' ? data.reviewText : undefined,
          supportTicket: typeof data.supportTicket === 'string' ? data.supportTicket : undefined,
          serviceCategory:
            typeof data.serviceCategory === 'string'
              ? (data.serviceCategory as BookingRecord['serviceCategory'])
              : undefined,
          assignedWorkerId:
            typeof data.assignedWorkerId === 'string' ? data.assignedWorkerId : undefined,
          dispatchStatus:
            data.dispatchStatus === 'Pinging Nearest' ||
            data.dispatchStatus === 'Accepted' ||
            data.dispatchStatus === 'Fallback Reassigned'
              ? data.dispatchStatus
              : undefined,
          distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : 2.5,
          etaMinutes: typeof data.etaMinutes === 'number' ? data.etaMinutes : 15,
          hubCoords:
            typeof data.hubLat === 'number' && typeof data.hubLng === 'number'
              ? { lat: data.hubLat, lng: data.hubLng }
              : fallbackCity.hub,
          siteCoords:
            typeof data.siteLat === 'number' && typeof data.siteLng === 'number'
              ? { lat: data.siteLat, lng: data.siteLng }
              : fallbackCity.defaultSite,
          imageUrl: HERO_DISPATCH_IMAGE,
        };
      });
      onData(mapped);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserLedger(
  userId: string,
  onData: (rows: LedgerEntry[]) => void
): () => void {
  const path = `users/${userId}/ledger`;
  const q = query(
    collection(db, 'users', userId, 'ledger'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const mapped: LedgerEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id),
          date: String(data.date),
          description: String(data.description),
          zone: String(data.zone),
          durationLabel: String(data.durationLabel),
          grossAmount: Number(data.grossAmount ?? 0),
          platformFee: Number(data.platformFee ?? 0),
          netAmount: Number(data.netAmount ?? 0),
          status: data.status,
        };
      });
      onData(mapped);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserRequirements(
  userId: string,
  onData: (rows: BusinessRequirement[]) => void
): () => void {
  const path = `users/${userId}/requirements`;
  const q = query(
    collection(db, 'users', userId, 'requirements'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const mapped: BusinessRequirement[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id),
          companyName: String(data.companyName),
          industry: data.industry,
          roleTitle: String(data.roleTitle),
          city: String(data.city),
          workersRequested: Number(data.workersRequested ?? 1),
          workersConfirmed: Number(data.workersConfirmed ?? 0),
          workersCheckedIn: Number(data.workersCheckedIn ?? 0),
          workFormat: data.workFormat,
          shiftWindow: String(data.shiftWindow),
          payoutPerWorker: Number(data.payoutPerWorker ?? 750),
          status: data.status,
          gstInvoiceId: String(data.gstInvoiceId),
        };
      });
      onData(mapped);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
