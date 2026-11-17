# ZEVRO Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}` and its subcollections (`bookings`, `ledger`, `requirements`, `workerProfiles`) belongs strictly to `request.auth.uid == userId`. No cross-user reads, lists, or writes are permitted.
2. **Verified Email Mandate**: Standard writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Identity & Temporal Integrity**:
   - `userId` (or `uid` on `/users/{userId}`) MUST equal `request.auth.uid` on create and CANNOT change on update.
   - `createdAt` MUST equal `request.time` on create and CANNOT change on update.
   - `updatedAt` MUST equal `request.time` on both create and update.
4. **Terminal State Locking**:
   - Bookings in `Completed` or `Cancelled` status cannot transition back to `Active` or alter financial amounts (`amount`, `gstOrFee`, `totalAmount`); only customer feedback (`rating`, `reviewText`) or `supportTicket` updates are allowed once `Completed`.
   - Ledger entries in `Settled` or `Withdrawn` status are strictly terminal and cannot be modified.
   - Business requirements in `Completed` status are strictly terminal.
5. **No Shadow Fields / ID Poisoning**: Every create enforces strict `keys().hasAll(...) && keys().hasOnly(...)` allowlists, path ID regex `^[a-zA-Z0-9_\-]+$`, and `.size()` caps on every string field.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Create `/users/alice/bookings/ZVR-9001` with `auth: null`.
2. **Unverified Email**: Create `/users/alice/bookings/ZVR-9001` with `email_verified: false`.
3. **Cross-User Read (PII Leak)**: Authenticated as `bob`, `get(/users/alice)` or `list(/users/alice/bookings)`.
4. **Cross-User Spoofed Owner**: Authenticated as `bob`, create `/users/bob/bookings/ZVR-9002` with `userId: "alice"`.
5. **Shadow / Ghost Field Injection**: Authenticated as `alice`, create `/users/alice/bookings/ZVR-9003` with extra `"isAdmin": true` or `"discountOverride": 9999`.
6. **ID Poisoning**: Authenticated as `alice`, create `/users/alice/bookings/bad..id$withSpaces` (fails `isValidId()`).
7. **Forged Timestamp**: Authenticated as `alice`, create `/users/alice/ledger/PAY-9001` with client-supplied `createdAt: Timestamp(2020-01-01)`.
8. **Mutating Immutable Escrow Amount**: Authenticated as `alice`, update `/users/alice/bookings/ZVR-8492` changing `totalAmount` from `4479` to `1`.
9. **Terminal Booking Re-Open**: Update a `Cancelled` booking back to `status: "Active"`.
10. **Terminal Ledger Tampering**: Update a `Withdrawn` ledger entry back to `status: "Settled"` or higher `netAmount`.
11. **Oversized String Exhaustion (Denial of Wallet)**: Create `/users/alice/bookings/ZVR-9004` with a 5,000-character `title` (> 180 chars limit).
12. **Type Poisoning**: Update `/users/alice/requirements/B2B-REQ-401` with `workersCheckedIn: "many"` (string instead of int) or negative `workersCheckedIn: -5`.
