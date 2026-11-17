# Security Specification — Recharge Expres Fintech Super App

## 1. Data Invariants
1. **Default Deny**: All unlisted collections and paths are strictly denied (`allow read, write: if false`).
2. **PII Isolation**: `/users/{userId}` documents contain PII (`email`, `phone`, `walletBalance`) and can only be read or modified by the document owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`).
3. **Immutable Double-Entry Ledger**: `/ledger/{entryId}` entries require `userId == request.auth.uid` (or `isAdmin()`), positive numeric amounts (`amount > 0`), valid `idempotencyKey`, and server timestamps (`createdAt == request.time`). Terminal states (`SUCCESS`, `FAILED`, `REFUNDED`) cannot be arbitrarily mutated by non-admins.
4. **Admin-Only Infrastructure Configs**: `/merchants/{merchantId}`, `/rechargeProviders/{providerId}`, `/whatsappConfig/{configId}`, and `/staffMembers/{staffId}` can only be written by verified admins (`isAdmin()`).
5. **No Blanket List Queries**: Every `allow list` rule enforces `resource.data.userId == request.auth.uid || isAdmin()`.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Writing to `/users/user_1` with `request.auth == null`.
2. **Unverified Email Write**: Writing to `/users/user_1` where `request.auth.token.email_verified == false`.
3. **Identity Spoofing on Create**: Creating `/ledger/tx_1` where `userId` is `"victim_uid"` while authenticated as `"attacker_uid"`.
4. **Privilege Escalation on Profile Create**: Creating `/users/attacker_uid` with `role: "SUPER_ADMIN"` as a non-admin user.
5. **Shadow / Ghost Field Injection**: Updating `/users/user_1` with an undeclared field `isSuperVerified: true`.
6. **Denial-of-Wallet Oversized String**: Creating `/supportTickets/t_1` with a 10,000-character `subject`.
7. **ID Poisoning Attack**: Creating a document with invalid characters or >128 chars in `{entryId}`.
8. **Cross-User PII Read**: Authenticated user `"attacker_uid"` attempting `get` or `list` on `/users/victim_uid`.
9. **Terminal State Mutation**: Non-admin user attempting to update a `/ledger/{entryId}` document whose `status` is already `'SUCCESS'`.
10. **Immutable Field Modification**: Updating `createdAt` or `uid` on `/users/{userId}` during an update operation.
11. **Timestamp Forgery**: Sending a past or future client timestamp for `createdAt` instead of `request.time`.
12. **Unauthorized Merchant Gateway Modification**: Standard customer attempting to overwrite `/merchants/paytm_prod`.
