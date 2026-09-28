# Golden Palace POS — Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default Deny**: Every unlisted path in Firestore is strictly denied (`allow read, write: if false;`).
2. **Verified Authentication**: Every write and read operation requires an authenticated user (`request.auth != null`) with `request.auth.token.email_verified == true`.
3. **Path ID Hardening**: Every single-document path parameter (`adminId`, `snapshotId`, `orderId`) must satisfy `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Strict Key Allowlisting**: Every document `create` and `update` must validate keys via `hasAll` and `hasOnly` inside standalone validation helpers (`isValidAdminUser`, `isValidPosSnapshot`, `isValidPosOrderCloud`), blocking shadow fields.
5. **Ownership & Identity Integrity**: `ownerId` must equal `request.auth.uid` on creation and remain immutable on update (`incoming().ownerId == existing().ownerId`).
6. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update.
7. **Terminal State Locking**: Once a `pos_orders` document reaches `COMPLETED` or `CANCELLED`, non-admin users cannot mutate its state.
8. **Query Enforcer on List Operations**: Every `allow list` rule enforces `resource.data.ownerId == request.auth.uid || isAdmin()`, preventing unauthorized collection scraping without `get()` inside `list`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Write**: `auth = null`, creating `/pos_orders/ord_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'grinto25@gmail.com', email_verified: false } }`, creating `/admins/u1` -> `PERMISSION_DENIED`.
3. **Self-Privilege Escalation**: Non-admin user `auth = { uid: 'u2', token: { email: 'attacker@example.com', email_verified: true } }` writing to `/admins/u2` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Creating `/pos_orders/ord_1` with extra key `"isSuperAdmin": true` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Update**: Updating `/pos_orders/ord_1` with extra key `"hacked": "yes"` -> `PERMISSION_DENIED`.
6. **Identity Spoofing on Create**: User `u1` creating `/pos_orders/ord_1` with `ownerId: "u2"` -> `PERMISSION_DENIED`.
7. **Owner Mutation on Update**: User `u1` updating `/pos_orders/ord_1` to change `ownerId` from `"u1"` to `"u2"` -> `PERMISSION_DENIED`.
8. **CreatedAt Tampering on Update**: Updating `/pos_orders/ord_1` with a modified `createdAt` timestamp -> `PERMISSION_DENIED`.
9. **Client-Forged Timestamp**: Creating `/pos_snapshots/snap_1` with `createdAt` not matching server `request.time` -> `PERMISSION_DENIED`.
10. **Terminal State Bypass**: Non-admin user updating `/pos_orders/ord_1` after `status` is already `'COMPLETED'` -> `PERMISSION_DENIED`.
11. **Oversized String DoW Attack**: Creating `/pos_snapshots/snap_1` with a 5,000-character `summary` string (`maxLength: 500`) -> `PERMISSION_DENIED`.
12. **Cross-Tenant PII/Order Read**: Authenticated user `u2` attempting `get` or `list` on `/pos_orders/ord_1` owned by `u1` -> `PERMISSION_DENIED`.
