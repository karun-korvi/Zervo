/**
 * ZEVRO Firestore Security Rules Dirty Dozen Specification Verifier
 * Documents all 12 adversarial cases defined in security_spec.md.
 * Run against Firebase Emulator (`@firebase/rules-unit-testing`) when emulator is available.
 */
export interface SecurityTestCase {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update';
  path: string;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write to Booking',
    actorUid: null,
    emailVerified: false,
    operation: 'create',
    path: '/users/alice/bookings/ZVR-9001',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write to Booking',
    actorUid: 'alice',
    emailVerified: false,
    operation: 'create',
    path: '/users/alice/bookings/ZVR-9001',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User Profile Read (PII Leak)',
    actorUid: 'bob',
    emailVerified: true,
    operation: 'get',
    path: '/users/alice',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User Spoofed Owner UID in Booking',
    actorUid: 'bob',
    emailVerified: true,
    operation: 'create',
    path: '/users/bob/bookings/ZVR-9002',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Ghost Field Injection',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: '/users/alice/bookings/ZVR-9003',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Document ID Poisoning',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: '/users/alice/bookings/bad..id$withSpaces',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged Client Timestamp on Ledger',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: '/users/alice/ledger/PAY-9001',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Mutating Immutable Escrow Amount',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'update',
    path: '/users/alice/bookings/ZVR-8492',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal Cancelled Booking Re-Open',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'update',
    path: '/users/alice/bookings/ZVR-8492',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal Ledger Withdrawn Tampering',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'update',
    path: '/users/alice/ledger/PAY-4320',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Oversized String Resource Exhaustion',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: '/users/alice/bookings/ZVR-9004',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Type Poisoning on B2B Workers Checked-In',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'update',
    path: '/users/alice/requirements/B2B-REQ-401',
    expectedResult: 'PERMISSION_DENIED',
  },
];
