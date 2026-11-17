export type UserRole = 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN';
export type KycStatus = 'VERIFIED' | 'PENDING' | 'MIN_KYC';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'LOCKED';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  kycStatus: KycStatus;
  walletBalance: number;
  cashbackEarned: number;
  referralCode: string;
  referredBy?: string;
  role: UserRole;
  status: AccountStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type LedgerEntryType = 'CREDIT' | 'DEBIT';
export type LedgerCategory =
  | 'ADD_MONEY'
  | 'RECHARGE'
  | 'BILL_PAYMENT'
  | 'UPI_TRANSFER'
  | 'BANK_PAYOUT'
  | 'CASHBACK'
  | 'REFERRAL_BONUS'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface LedgerEntry {
  id: string;
  txId: string;
  userId: string;
  entryType: LedgerEntryType;
  category: LedgerCategory;
  service: string;
  provider: string;
  targetAccount: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  idempotencyKey: string;
  gatewayRef: string;
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type GatewayType = 'PAYTM' | 'PHONEPE' | 'RAZORPAY' | 'CASHFREE' | 'CUSTOM';

export interface MerchantGateway {
  id: string;
  name: string;
  gatewayType: GatewayType;
  merchantIdCode: string;
  apiKeyMasked: string;
  webhookUrl: string;
  isDefault: boolean;
  enabled: boolean;
  environment: 'PRODUCTION' | 'SANDBOX';
  status: 'VERIFIED' | 'TESTING' | 'DISABLED';
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RechargeProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiTokenMasked: string;
  rechargeEndpoint: string;
  statusEndpoint: string;
  balanceEndpoint: string;
  callbackUrl: string;
  priority: number;
  commissionPercent: number;
  enabled: boolean;
  balance: number;
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WhatsAppConfig {
  id: string;
  businessPhone: string;
  phoneNumberId: string;
  wabaId: string;
  accessTokenMasked: string;
  webhookVerifyToken: string;
  otpExpirySeconds: number;
  maxResendAttempts: number;
  enabled: boolean;
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  accountHolder: string;
  accountNumberMasked: string;
  ifsc: string;
  mode: 'IMPS' | 'NEFT' | 'UPI';
  amount: number;
  fee: number;
  status: 'PENDING_APPROVAL' | 'PROCESSING' | 'SETTLED' | 'REJECTED';
  utrNumber: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  roleTitle: string;
  permissions: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  txId: string;
  subject: string;
  category: 'RECHARGE_DISPUTE' | 'REFUND_REQUEST' | 'WALLET_ISSUE' | 'KYC_VERIFICATION' | 'GENERAL';
  amount: number;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REFUND_APPROVED' | 'REJECTED';
  resolutionNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  module: string;
  targetId: string;
  details: string;
  createdAt?: unknown;
}

export interface ServiceOperatorPlan {
  id: string;
  amount: number;
  validity: string;
  data: string;
  calls: string;
  tag: string;
}
