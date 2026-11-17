/**
 * Phase 0 & Phase 5 — Dirty Dozen Payload Security Specification Verification
 * Verifies that all 12 adversarial payloads against Recharge Expres Firestore Rules
 * are rejected with PERMISSION_DENIED.
 */

export interface AdversarialTestPayload {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: AdversarialTestPayload[] = [
  {
    id: 1,
    name: 'Unauthenticated Write to Users Collection',
    collectionPath: '/users/user_1',
    operation: 'create',
    authUid: null,
    emailVerified: false,
    payload: { uid: 'user_1', name: 'Attacker', walletBalance: 50000 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write Attempt',
    collectionPath: '/users/user_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: false,
    payload: { uid: 'user_1', email: 'www.maa365@gmail.com', role: 'CUSTOMER' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Ledger Create',
    collectionPath: '/ledger/tx_spoof_1',
    operation: 'create',
    authUid: 'attacker_uid',
    emailVerified: true,
    payload: { txId: 'TXN10001', userId: 'victim_uid', amount: 1000, entryType: 'DEBIT' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-Assigned SUPER_ADMIN Privilege Escalation',
    collectionPath: '/users/attacker_uid',
    operation: 'create',
    authUid: 'attacker_uid',
    emailVerified: true,
    payload: { uid: 'attacker_uid', role: 'SUPER_ADMIN', walletBalance: 0 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow / Ghost Field Injection on User Profile Update',
    collectionPath: '/users/user_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { name: 'Valid Name', isBypassedKyc: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Denial-of-Wallet Oversized String in Support Ticket',
    collectionPath: '/supportTickets/ticket_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', subject: 'A'.repeat(5000) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Path Variable ID Poisoning with Invalid Characters',
    collectionPath: '/ledger/invalid$id!@#',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { userId: 'user_1', amount: 100 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-User PII Read on User Profile',
    collectionPath: '/users/victim_uid',
    operation: 'get',
    authUid: 'attacker_uid',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Mutation on Completed Ledger Entry',
    collectionPath: '/ledger/completed_tx_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { status: 'REFUNDED', amount: 999999 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Modification (createdAt / uid)',
    collectionPath: '/users/user_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: { uid: 'different_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery on Audit Log Creation',
    collectionPath: '/auditLogs/log_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { actorUid: 'user_1', createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Payment Merchant Gateway Overwrite by Customer',
    collectionPath: '/merchants/paytm_gateway',
    operation: 'update',
    authUid: 'customer_uid',
    emailVerified: true,
    payload: { enabled: false, webhookUrl: 'https://evil.example.com/webhook' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
