import React, { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Sun, Moon, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { CustomerSuperAppView } from './components/CustomerSuperAppView.tsx';
import { SuperAdminDashboardView } from './components/SuperAdminDashboardView.tsx';
import { StaffPanelView } from './components/StaffPanelView.tsx';
import { DeliverablesAndLegalView } from './components/DeliverablesAndLegalView.tsx';
import {
  UserProfile,
  LedgerEntry,
  MerchantGateway,
  RechargeProvider,
  WhatsAppConfig,
  PayoutRequest,
  StaffMember,
  SupportTicket,
  AuditLog,
} from './types/fintech.ts';
import { ensureUserProfileAndSeedDefaults } from './services/firestoreService.ts';

const INITIAL_FALLBACK_USER: UserProfile = {
  uid: 'guest_preview_uid',
  name: 'Rajesh Kumar',
  email: 'www.maa365@gmail.com',
  phone: '9876543210',
  kycStatus: 'VERIFIED',
  walletBalance: 1250.0,
  cashbackEarned: 45.0,
  referralCode: 'RXP7790',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
};

const INITIAL_FALLBACK_LEDGER: LedgerEntry[] = [
  {
    id: 'RXP9982011',
    txId: 'RXP9982011',
    userId: 'guest_preview_uid',
    entryType: 'CREDIT',
    category: 'ADD_MONEY',
    service: 'Wallet Top-Up (Verified)',
    provider: 'Paytm Payment Gateway',
    targetAccount: 'Primary Wallet Ledger',
    amount: 1500.0,
    balanceBefore: 49.0,
    balanceAfter: 1549.0,
    status: 'SUCCESS',
    idempotencyKey: 'IDEMP_OPEN_9982011',
    gatewayRef: 'PYTM_HMAC_88392A',
    description: 'Verified wallet credit via Paytm Payment Gateway webhook',
  },
  {
    id: 'BBPS8839104',
    txId: 'BBPS8839104',
    userId: 'guest_preview_uid',
    entryType: 'DEBIT',
    category: 'RECHARGE',
    service: 'Mobile Prepaid',
    provider: 'Jio True 5G',
    targetAccount: '9876543210',
    amount: 299.0,
    balanceBefore: 1549.0,
    balanceAfter: 1250.0,
    status: 'SUCCESS',
    idempotencyKey: 'IDEMP_RCH_8839104',
    gatewayRef: 'OP_JIOTRU_591022',
    description: 'Mobile Prepaid recharge for 9876543210 via Jio True 5G',
  },
];

const INITIAL_FALLBACK_MERCHANTS: MerchantGateway[] = [
  {
    id: 'merchant_paytm_pg',
    name: 'Paytm Payment Gateway',
    gatewayType: 'PAYTM',
    merchantIdCode: 'RXP_PAYTM_MID_9012',
    apiKeyMasked: 'pytm_live_••••••••89F1',
    webhookUrl: 'https://api.rechargeexpres.in/api/webhooks/paytm',
    isDefault: true,
    enabled: true,
    environment: 'PRODUCTION',
    status: 'VERIFIED',
    updatedBy: 'system',
  },
  {
    id: 'merchant_razorpay_pg',
    name: 'Razorpay Enterprise PG',
    gatewayType: 'RAZORPAY',
    merchantIdCode: 'RXP_RZP_MID_4410',
    apiKeyMasked: 'rzp_live_••••••••44C8',
    webhookUrl: 'https://api.rechargeexpres.in/api/webhooks/razorpay',
    isDefault: false,
    enabled: true,
    environment: 'PRODUCTION',
    status: 'VERIFIED',
    updatedBy: 'system',
  },
  {
    id: 'merchant_phonepe_pg',
    name: 'PhonePe Payment Gateway',
    gatewayType: 'PHONEPE',
    merchantIdCode: 'PGTESTPAYUAT86',
    apiKeyMasked: 'phpe_uat_••••••••31A0',
    webhookUrl: 'https://api.rechargeexpres.in/api/webhooks/phonepe',
    isDefault: false,
    enabled: true,
    environment: 'SANDBOX',
    status: 'TESTING',
    updatedBy: 'system',
  },
];

const INITIAL_FALLBACK_PROVIDERS: RechargeProvider[] = [
  {
    id: 'provider_npci_bbps',
    name: 'NPCI Bharat BillPay (BBPS Primary Hub)',
    baseUrl: 'https://bbps.rechargeexpres.in/v2',
    apiTokenMasked: 'bbps_tok_••••••••77E2',
    rechargeEndpoint: '/bills/pay-verified',
    statusEndpoint: '/bills/status-check',
    balanceEndpoint: '/agent/pool-balance',
    callbackUrl: 'https://api.rechargeexpres.in/api/callbacks/bbps',
    priority: 1,
    commissionPercent: 2.4,
    enabled: true,
    balance: 485000.0,
    updatedBy: 'system',
  },
  {
    id: 'provider_eko_telecom',
    name: 'Direct Telecom Aggregator (Prepaid/DTH)',
    baseUrl: 'https://telecom.rechargeexpres.in/api/v1',
    apiTokenMasked: 'tel_live_••••••••19B4',
    rechargeEndpoint: '/prepaid/execute',
    statusEndpoint: '/prepaid/transaction-status',
    balanceEndpoint: '/merchant/ledger-balance',
    callbackUrl: 'https://api.rechargeexpres.in/api/callbacks/telecom',
    priority: 2,
    commissionPercent: 3.1,
    enabled: true,
    balance: 215400.0,
    updatedBy: 'system',
  },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeNav, setActiveNav] = useState<
    'SUPER_APP' | 'SUPER_ADMIN' | 'STAFF_PANEL' | 'DELIVERABLES' | 'LEGAL'
  >('SUPER_APP');

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_FALLBACK_USER);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([INITIAL_FALLBACK_USER]);
  const [ledger, setLedger] = useState<LedgerEntry[]>(INITIAL_FALLBACK_LEDGER);
  const [merchants, setMerchants] = useState<MerchantGateway[]>(INITIAL_FALLBACK_MERCHANTS);
  const [providers, setProviders] = useState<RechargeProvider[]>(INITIAL_FALLBACK_PROVIDERS);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFbUser(currentUser);
      if (currentUser) {
        try {
          const profile = await ensureUserProfileAndSeedDefaults(
            currentUser.uid,
            currentUser.displayName || 'Recharge Expres User',
            currentUser.email || 'user@rechargeexpres.in'
          );
          setUserProfile(profile);
        } catch {
          setUserProfile({
            ...INITIAL_FALLBACK_USER,
            uid: currentUser.uid,
            name: currentUser.displayName || 'Recharge Expres User',
            email: currentUser.email || 'user@rechargeexpres.in',
            role: currentUser.email === 'www.maa365@gmail.com' ? 'SUPER_ADMIN' : 'CUSTOMER',
          });
        }
      } else {
        setUserProfile(INITIAL_FALLBACK_USER);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const isBootstrappedAdmin =
    fbUser?.email === 'www.maa365@gmail.com' || userProfile.role === 'SUPER_ADMIN';

  // Attach real-time Firestore listeners once authenticated
  useEffect(() => {
    if (!authReady || !fbUser) return;

    const unsubscribers: Array<() => void> = [];

    // 1. Current user profile listener
    const userUnsub = onSnapshot(
      doc(db, 'users', fbUser.uid),
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`)
    );
    unsubscribers.push(userUnsub);

    // 2. Ledger listener (filtered by userId for customers, or all for admin)
    const ledgerQuery =
      fbUser.email === 'www.maa365@gmail.com'
        ? collection(db, 'ledger')
        : query(collection(db, 'ledger'), where('userId', '==', fbUser.uid));

    const ledgerUnsub = onSnapshot(
      ledgerQuery,
      (snap) => {
        const items: LedgerEntry[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<LedgerEntry, 'id'>) }));
        if (items.length > 0) setLedger(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ledger')
    );
    unsubscribers.push(ledgerUnsub);

    // 3. Enabled Merchants listener
    const merchantsQuery =
      fbUser.email === 'www.maa365@gmail.com'
        ? collection(db, 'merchants')
        : query(collection(db, 'merchants'), where('enabled', '==', true));

    const merchantsUnsub = onSnapshot(
      merchantsQuery,
      (snap) => {
        const items: MerchantGateway[] = [];
        snap.forEach((d) =>
          items.push({ id: d.id, ...(d.data() as Omit<MerchantGateway, 'id'>) })
        );
        if (items.length > 0) setMerchants(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'merchants')
    );
    unsubscribers.push(merchantsUnsub);

    // 4. Recharge Providers listener
    const providersQuery =
      fbUser.email === 'www.maa365@gmail.com'
        ? collection(db, 'rechargeProviders')
        : query(collection(db, 'rechargeProviders'), where('enabled', '==', true));

    const providersUnsub = onSnapshot(
      providersQuery,
      (snap) => {
        const items: RechargeProvider[] = [];
        snap.forEach((d) =>
          items.push({ id: d.id, ...(d.data() as Omit<RechargeProvider, 'id'>) })
        );
        if (items.length > 0) setProviders(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'rechargeProviders')
    );
    unsubscribers.push(providersUnsub);

    // 5. Payout Requests listener
    const payoutsQuery =
      fbUser.email === 'www.maa365@gmail.com'
        ? collection(db, 'payoutRequests')
        : query(collection(db, 'payoutRequests'), where('userId', '==', fbUser.uid));

    const payoutsUnsub = onSnapshot(
      payoutsQuery,
      (snap) => {
        const items: PayoutRequest[] = [];
        snap.forEach((d) =>
          items.push({ id: d.id, ...(d.data() as Omit<PayoutRequest, 'id'>) })
        );
        setPayouts(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payoutRequests')
    );
    unsubscribers.push(payoutsUnsub);

    // 6. Support Tickets listener
    const ticketsQuery =
      fbUser.email === 'www.maa365@gmail.com'
        ? collection(db, 'supportTickets')
        : query(collection(db, 'supportTickets'), where('userId', '==', fbUser.uid));

    const ticketsUnsub = onSnapshot(
      ticketsQuery,
      (snap) => {
        const items: SupportTicket[] = [];
        snap.forEach((d) =>
          items.push({ id: d.id, ...(d.data() as Omit<SupportTicket, 'id'>) })
        );
        setTickets(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'supportTickets')
    );
    unsubscribers.push(ticketsUnsub);

    // 7. Audit Logs listener
    const logsQuery =
      fbUser.email === 'www.maa365@gmail.com'
        ? collection(db, 'auditLogs')
        : query(collection(db, 'auditLogs'), where('actorUid', '==', fbUser.uid));

    const logsUnsub = onSnapshot(
      logsQuery,
      (snap) => {
        const items: AuditLog[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }));
        setAuditLogs(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );
    unsubscribers.push(logsUnsub);

    // 8. Admin-only collections (All Users, WhatsApp Config, Staff Members)
    if (fbUser.email === 'www.maa365@gmail.com') {
      const allUsersUnsub = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list: UserProfile[] = [];
          snap.forEach((d) => list.push(d.data() as UserProfile));
          if (list.length > 0) setAllUsers(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );
      unsubscribers.push(allUsersUnsub);

      const waUnsub = onSnapshot(
        doc(db, 'whatsappConfig', 'primary_meta_cloud'),
        (snap) => {
          if (snap.exists()) {
            setWhatsappConfig({
              id: snap.id,
              ...(snap.data() as Omit<WhatsAppConfig, 'id'>),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'whatsappConfig/primary_meta_cloud')
      );
      unsubscribers.push(waUnsub);

      const staffUnsub = onSnapshot(
        collection(db, 'staffMembers'),
        (snap) => {
          const list: StaffMember[] = [];
          snap.forEach((d) =>
            list.push({ id: d.id, ...(d.data() as Omit<StaffMember, 'id'>) })
          );
          setStaffList(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'staffMembers')
      );
      unsubscribers.push(staffUnsub);
    }

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [authReady, fbUser]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      setAuthError(error.message || 'Sign-in cancelled or blocked by popup blocker.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* TOP BAR CONTRACT: Strictly 3 Zones Separated by gap-8 */}
        <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 bg-[#002D85] text-white border-b border-blue-900/80 sticky top-0 z-30">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('SUPER_APP');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Recharge Expres
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold text-blue-100 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveNav('SUPER_APP')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'SUPER_APP'
                  ? 'text-amber-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Customer App
            </button>
            <button
              onClick={() => setActiveNav('SUPER_ADMIN')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'SUPER_ADMIN'
                  ? 'text-amber-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => setActiveNav('STAFF_PANEL')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'STAFF_PANEL'
                  ? 'text-amber-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Staff Panel
            </button>
            <button
              onClick={() => setActiveNav('DELIVERABLES')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'DELIVERABLES'
                  ? 'text-amber-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Source & APK
            </button>
            <button
              onClick={() => setActiveNav('LEGAL')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'LEGAL'
                  ? 'text-amber-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Legal
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            {fbUser ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="px-3 py-1.5 text-xs font-bold text-[#002D85] bg-white rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Compact Theme & Session Bar (Hidden on mobile Customer App for pure native edge-to-edge look) */}
        <div
          className={`${
            activeNav === 'SUPER_APP' ? 'hidden md:block' : 'block'
          } bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-2`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">
                {fbUser
                  ? `Authenticated: ${fbUser.email}`
                  : 'Interactive Native App Mode'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Wallet: ₹{Number(userProfile.walletBalance || 0).toFixed(2)}
              </span>
              <span aria-hidden="true">·</span>
              <span>KYC: {userProfile.kycStatus}</span>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </div>
        </div>

        {authError && (
          <div className="max-w-7xl mx-auto px-4 pt-3">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex justify-between">
              <span>{authError}</span>
              <button
                onClick={() => setAuthError(null)}
                className="underline font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1">
          {activeNav === 'SUPER_APP' && (
            <CustomerSuperAppView
              user={userProfile}
              ledger={ledger}
              merchants={merchants}
              payouts={payouts}
              tickets={tickets}
              isSignedIn={Boolean(fbUser)}
              onRequireSignIn={handleGoogleSignIn}
              onUpdateUser={setUserProfile}
              onPrependLedger={(newEntries) =>
                setLedger((prev) => [...newEntries, ...prev])
              }
              onPrependPayout={(newPayout) =>
                setPayouts((prev) => [newPayout, ...prev])
              }
              onPrependTicket={(newTicket) =>
                setTickets((prev) => [newTicket, ...prev])
              }
              onNavigateView={setActiveNav}
            />
          )}

          {activeNav === 'SUPER_ADMIN' && (
            <SuperAdminDashboardView
              currentUser={userProfile}
              allUsers={allUsers}
              ledger={ledger}
              merchants={merchants}
              providers={providers}
              whatsappConfig={whatsappConfig}
              payouts={payouts}
              staffList={staffList}
              tickets={tickets}
              auditLogs={auditLogs}
              isAdminUser={isBootstrappedAdmin}
            />
          )}

          {activeNav === 'STAFF_PANEL' && (
            <StaffPanelView
              currentUser={userProfile}
              staffList={staffList}
              ledger={ledger}
              tickets={tickets}
              payouts={payouts}
            />
          )}

          {activeNav === 'DELIVERABLES' && (
            <DeliverablesAndLegalView mode="DELIVERABLES" />
          )}

          {activeNav === 'LEGAL' && <DeliverablesAndLegalView mode="LEGAL" />}
        </main>

        {/* Clean Editorial Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-6 pb-24 mt-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              © {new Date().getFullYear()} Recharge Expres Fintech Platform. Double-Entry Wallet Ledger & BBPS Multi-Provider Suite.
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => setActiveNav('LEGAL')} className="hover:underline">
                About Us
              </button>
              <button onClick={() => setActiveNav('LEGAL')} className="hover:underline">
                Terms & Conditions
              </button>
              <button onClick={() => setActiveNav('LEGAL')} className="hover:underline">
                Privacy Policy
              </button>
              <button onClick={() => setActiveNav('LEGAL')} className="hover:underline">
                Refund Policy
              </button>
              <button onClick={() => setActiveNav('DELIVERABLES')} className="hover:underline">
                Android APK & Source
              </button>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
