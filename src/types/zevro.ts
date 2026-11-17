export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type ScreenId = 'services' | 'jobs' | 'bookings' | 'earnings' | 'pros' | 'track';

export type WorkspaceMode = 'consumer' | 'pro' | 'business';

export type BusinessSegment = 'B2C' | 'B2B';

export type ServiceCategory =
  | 'All'
  | 'Healthcare & Medical'
  | 'Education & Tutoring'
  | 'Home Services'
  | 'Vehicle & Transportation'
  | 'Food & Cooking'
  | 'Cleaning & Housekeeping'
  | 'Personal Care & Beauty'
  | 'Childcare & Elderly Care'
  | 'Security Services'
  | 'Construction & Maintenance'
  | 'Logistics & Warehouse'
  | 'Events & Entertainment'
  | 'Professional Services'
  | 'IT & Digital Services'
  | 'Pet Care';

export type ProfessionalCategory =
  | 'Doctor'
  | 'Teacher'
  | 'Swimming Coach'
  | 'CA'
  | 'Trainer'
  | 'Dietitian'
  | 'Counsellor'
  | 'Architect'
  | 'Interior Designer'
  | 'Consultant';

export type B2BIndustry =
  | 'Office & Corporate'
  | 'Warehouse & E-commerce'
  | 'Hospitals & Healthcare'
  | 'Schools & Colleges'
  | 'Hotels & Hospitality'
  | 'Shopping Malls & Retail'
  | 'Manufacturing & Industrial'
  | 'Logistics & Transportation'
  | 'Construction & Real Estate'
  | 'Security & Facility Management'
  | 'Events & Temporary Workforce'
  | 'IT & Digital Professionals';

export type WorkFormat =
  | 'Daily Jobs'
  | 'Part-Time'
  | 'Full-Time'
  | 'Temporary'
  | 'Weekend Jobs'
  | 'Night Shifts'
  | 'Contract Jobs'
  | 'Project-Based'
  | 'Skilled Jobs'
  | 'Unskilled / Entry-Level'
  | 'Remote Jobs'
  | 'Freelance';

export interface CategoryDirectoryEntry {
  id: Exclude<ServiceCategory, 'All'>;
  number: number;
  pillarFocus: string;
  b2cRoles: { service: string; professional: string }[];
  b2bRoles: { jobRole: string; work: string }[];
  imageUrl: string;
  imageAlt: string;
}

export interface ConnectedEcosystemRow {
  professional: string;
  b2cCustomer: string;
  b2bCustomer: string;
  category: Exclude<ServiceCategory, 'All'>;
}

export interface ServiceOffering {
  id: string;
  title: string;
  segment: BusinessSegment;
  category: Exclude<ServiceCategory, 'All'>;
  industry?: B2BIndustry;
  summary: string;
  flatPrice: number;
  unitLabel: string;
  durationMins: number;
  arrivalEta: string;
  etaMinutes: number;
  distanceKm: number;
  warrantyDays: number;
  rating: number;
  completedCount: number;
  inclusions: string[];
  cityAvailability: string[];
  instantDispatch: boolean;
  allowsHeadcount?: boolean;
  hubName: string;
  hubCoords: LatLngPoint;
  siteName: string;
  siteCoords: LatLngPoint;
  workersNeededToday: number;
  workersActiveToday: number;
  imageUrl: string;
  imageAlt: string;
}

export type ShiftUrgency = 'Standard' | 'Urgent Fill';

export type ShiftBucket = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface JobShift {
  id: string;
  title: string;
  segment: BusinessSegment;
  trade: Exclude<ServiceCategory, 'All'>;
  industry?: B2BIndustry;
  workFormat: WorkFormat;
  employer: string;
  city: string;
  locality: string;
  distanceKm: number;
  etaMinutes: number;
  shiftDate: string;
  shiftWindow: string;
  shiftBucket: ShiftBucket;
  durationHours: number;
  basePay: number;
  surgeBonus: number;
  totalPayout: number;
  urgency: ShiftUrgency;
  instantEscrow: boolean;
  credentialsRequired: string[];
  brief: string;
  slotsRemaining: number;
  workersNeededToday: number;
  workersAssignedToday: number;
  hubCoords: LatLngPoint;
  siteCoords: LatLngPoint;
  imageUrl: string;
  imageAlt: string;
}

export interface OrderCartItem {
  service: ServiceOffering;
  quantity: number;
}

export type DispatchStage = 0 | 1 | 2 | 3;

export type BookingStatus = 'Active' | 'Completed' | 'Cancelled';

export type BookingKind =
  | 'service_booking'
  | 'claimed_shift'
  | 'custom_request'
  | 'professional_appointment';

export interface BookingRecord {
  id: string;
  kind: BookingKind;
  segment?: BusinessSegment;
  title: string;
  counterpartyName: string;
  counterpartyMeta: string;
  city: string;
  address: string;
  scheduledSlot: string;
  headcount?: number;
  gstin?: string;
  amount: number;
  gstOrFee: number;
  totalAmount: number;
  stage: DispatchStage;
  status: BookingStatus;
  escrowCode: string;
  notes?: string;
  rating?: number;
  reviewText?: string;
  supportTicket?: string;
  serviceCategory?: Exclude<ServiceCategory, 'All'>;
  assignedWorkerId?: string;
  dispatchStatus?: 'Pinging Nearest' | 'Accepted' | 'Fallback Reassigned';
  hubCoords?: LatLngPoint;
  siteCoords?: LatLngPoint;
  distanceKm?: number;
  etaMinutes?: number;
  imageUrl?: string;
}

export type LedgerStatus = 'Settled' | 'In Escrow' | 'Withdrawn';

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  zone: string;
  durationLabel: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: LedgerStatus;
}

export interface VerifiedPro {
  id: string;
  name: string;
  initials: string;
  segment: BusinessSegment;
  primaryTrade: Exclude<ServiceCategory, 'All'>;
  professionalCategory?: ProfessionalCategory;
  specialtyTitle: string;
  qualifications?: string;
  registrationNumber?: string;
  availableSlots?: string[];
  city: string;
  locality: string;
  yearsExperience: number;
  completedJobs: number;
  rating: number;
  onTimeRate: number;
  hourlyRate: number;
  flatVisitFee: number;
  nextAvailable: string;
  availability: 'Full-Time' | 'Part-Time' | 'Shift-Flexible';
  workPreference: 'Daily' | 'Monthly' | 'Daily & Monthly';
  verificationStatus: 'Verified' | 'Pending Review';
  credentials: string[];
  bio: string;
  currentCoords: LatLngPoint;
  imageUrl: string;
  imageAlt: string;
}

export type DemandLevel = 'Peak Demand' | 'High Demand' | 'Steady';

export interface DailyDemandMetric {
  id: string;
  tradeTitle: string;
  category: Exclude<ServiceCategory, 'All'>;
  segment: BusinessSegment;
  city: string;
  zoneName: string;
  zoneCoords: LatLngPoint;
  workersNeededToday: number;
  workersAssignedToday: number;
  demandLevel: DemandLevel;
  avgPayoutRange: string;
  linkedServiceId: string;
  linkedShiftId: string;
  imageUrl: string;
  imageAlt: string;
}

export interface BusinessRequirement {
  id: string;
  companyName: string;
  industry: B2BIndustry;
  roleTitle: string;
  city: string;
  workersRequested: number;
  workersConfirmed: number;
  workersCheckedIn: number;
  workFormat: WorkFormat;
  shiftWindow: string;
  payoutPerWorker: number;
  status: 'Recruiting' | 'Shift Active' | 'Settled';
  gstInvoiceId: string;
}

export interface VerificationQueueItem {
  id: string;
  applicantName: string;
  accountType: 'Worker' | 'Business' | 'Partner' | 'Support Dispute';
  detail: string;
  city: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Flagged';
}

export type LiveWorkTarget =
  | { type: 'service'; service: ServiceOffering }
  | { type: 'shift'; shift: JobShift }
  | { type: 'booking'; booking: BookingRecord };
