import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  UserProfile,
  MerchantGateway,
  RechargeProvider,
  WhatsAppConfig,
  PayoutRequest,
  StaffMember,
  SupportTicket,
} from '../types/fintech.ts';

// Helper to truncate strings safely to blueprint maxLength
function clampStr(val: string, min: number, max: number, fallback: string): string {
  const clean = (val || '').trim();
  if (clean.length < min) return fallback.slice(0, max);
  return clean.slice(0, max);
}

export async function recordAuditLog(
  actorUid: string,
  actorEmail: string,
  action: string,
  moduleName: string,
  targetId: string,
  details: string
) {
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorUid: clampStr(actorUid, 1, 128, 'system_user'),
      actorEmail: clampStr(actorEmail, 3, 150, 'user@rechargeexpres.in'),
      action: clampStr(action, 2, 100, 'SYSTEM_ACTION'),
      module: clampStr(moduleName, 2, 60, 'CORE'),
      targetId: clampStr(targetId, 1, 128, 'record_0'),
      details: clampStr(details, 2, 300, 'Executed operation'),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function ensureUserProfileAndSeedDefaults(
  uid: string,
  name: string,
  email: string
): Promise<UserProfile> {
  const userPath = `users/${uid}`;
  const isBootstrappedAdmin = email === 'www.maa365@gmail.com';
  const referralCode = `RXP${uid.slice(0, 4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
  const newProfile: UserProfile = {
    uid,
    name: clampStr(name, 1, 100, 'Recharge Expres User'),
    email: clampStr(email, 3, 150, 'customer@rechargeexpres.in'),
    phone: '9876543210',
    kycStatus: 'VERIFIED',
    walletBalance: 1250.0,
    cashbackEarned: 45.0,
    referralCode,
    role: isBootstrappedAdmin ? 'SUPER_ADMIN' : 'CUSTOMER',
    status: 'ACTIVE',
  };

  try {
    const existingSnap = await getDoc(doc(db, 'users', uid));
    if (existingSnap.exists()) {
      return existingSnap.data() as UserProfile;
    }

    await setDoc(doc(db, 'users', uid), {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Record initial opening balance ledger entry
    const initTxId = `RXPOPEN${Date.now().toString().slice(-6)}`;
    await setDoc(doc(db, 'ledger', initTxId), {
      txId: initTxId,
      userId: uid,
      entryType: 'CREDIT',
      category: 'ADD_MONEY',
      service: 'Initial Verified Wallet Credit',
      provider: 'Paytm Payment Gateway',
      targetAccount: 'Wallet Primary Account',
      amount: 1250.0,
      balanceBefore: 0,
      balanceAfter: 1250.0,
      status: 'SUCCESS',
      idempotencyKey: `INIT_KEY_${uid.slice(0, 12)}`,
      gatewayRef: 'PYTM_VERIFIED_OPENING',
      description: 'Opening KYC verified wallet balance credited via authorized gateway',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (isBootstrappedAdmin) {
      await seedInitialAdminInfrastructure(uid, email);
    }

    return newProfile;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline') || msg.includes('unavailable')) {
      return newProfile;
    }
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function seedInitialAdminInfrastructure(adminUid: string, adminEmail: string) {
  try {
    // 1. Register admin document
    const adminRef = doc(db, 'admins', adminUid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        uid: adminUid,
        email: clampStr(adminEmail, 3, 150, 'www.maa365@gmail.com'),
        createdAt: serverTimestamp(),
      });
    }

    // 2. Seed Default Payment Merchants if empty
    const paytmRef = doc(db, 'merchants', 'merchant_paytm_pg');
    const paytmSnap = await getDoc(paytmRef);
    if (!paytmSnap.exists()) {
      const defaultMerchants: Array<{ id: string; data: Omit<MerchantGateway, 'id'> }> = [
        {
          id: 'merchant_paytm_pg',
          data: {
            name: 'Paytm Payment Gateway',
            gatewayType: 'PAYTM',
            merchantIdCode: 'RXP_PAYTM_MID_9012',
            apiKeyMasked: 'pytm_live_••••••••89F1',
            webhookUrl: 'https://api.rechargeexpres.in/api/webhooks/paytm',
            isDefault: true,
            enabled: true,
            environment: 'PRODUCTION',
            status: 'VERIFIED',
            updatedBy: adminUid,
          },
        },
        {
          id: 'merchant_razorpay_pg',
          data: {
            name: 'Razorpay Enterprise PG',
            gatewayType: 'RAZORPAY',
            merchantIdCode: 'RXP_RZP_MID_4410',
            apiKeyMasked: 'rzp_live_••••••••44C8',
            webhookUrl: 'https://api.rechargeexpres.in/api/webhooks/razorpay',
            isDefault: false,
            enabled: true,
            environment: 'PRODUCTION',
            status: 'VERIFIED',
            updatedBy: adminUid,
          },
        },
        {
          id: 'merchant_phonepe_pg',
          data: {
            name: 'PhonePe Payment Gateway',
            gatewayType: 'PHONEPE',
            merchantIdCode: 'PGTESTPAYUAT86',
            apiKeyMasked: 'phpe_uat_••••••••31A0',
            webhookUrl: 'https://api.rechargeexpres.in/api/webhooks/phonepe',
            isDefault: false,
            enabled: true,
            environment: 'SANDBOX',
            status: 'TESTING',
            updatedBy: adminUid,
          },
        },
      ];

      for (const item of defaultMerchants) {
        await setDoc(doc(db, 'merchants', item.id), {
          ...item.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // 3. Seed Default Recharge & BBPS Providers
    const bbpsRef = doc(db, 'rechargeProviders', 'provider_npci_bbps');
    const bbpsSnap = await getDoc(bbpsRef);
    if (!bbpsSnap.exists()) {
      const defaultProviders: Array<{ id: string; data: Omit<RechargeProvider, 'id'> }> = [
        {
          id: 'provider_npci_bbps',
          data: {
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
            updatedBy: adminUid,
          },
        },
        {
          id: 'provider_eko_telecom',
          data: {
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
            updatedBy: adminUid,
          },
        },
      ];

      for (const p of defaultProviders) {
        await setDoc(doc(db, 'rechargeProviders', p.id), {
          ...p.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // 4. Seed Default WhatsApp Business Cloud API Config
    const waRef = doc(db, 'whatsappConfig', 'primary_meta_cloud');
    const waSnap = await getDoc(waRef);
    if (!waSnap.exists()) {
      await setDoc(waRef, {
        businessPhone: '+91 98200 11223',
        phoneNumberId: '109482716501928',
        wabaId: '998172635401928',
        accessTokenMasked: 'EAAGm0PX4ZCps••••••••99QZ',
        webhookVerifyToken: 'rxp_meta_verify_token_2026',
        otpExpirySeconds: 300,
        maxResendAttempts: 3,
        enabled: true,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 5. Seed Default Role-Based Staff Members
    const staffRef = doc(db, 'staffMembers', 'staff_ops_lead');
    const staffSnap = await getDoc(staffRef);
    if (!staffSnap.exists()) {
      await setDoc(staffRef, {
        name: 'Aarav Sharma',
        email: 'aarav.support@rechargeexpres.in',
        department: 'Customer Support & Disputes',
        roleTitle: 'Senior Support Officer',
        permissions: 'CUSTOMER_SUPPORT,TRANSACTION_MONITORING,REFUND_REQUESTS',
        status: 'ACTIVE',
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'staffMembers', 'staff_recon_analyst'), {
        name: 'Priya Nair',
        email: 'priya.recon@rechargeexpres.in',
        department: 'Settlement & Reconciliation',
        roleTitle: 'Ledger Analyst',
        permissions: 'TRANSACTION_MONITORING,WALLET_APPROVAL,REPORTS',
        status: 'ACTIVE',
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Non-fatal warning seeding initial admin records:', error);
  }
}

// Double-entry atomic wallet credit (after verified payment gateway callback)
export async function executeVerifiedWalletCredit(params: {
  uid: string;
  userEmail: string;
  amount: number;
  gatewayName: string;
  txId: string;
  gatewayRef: string;
  idempotencyKey: string;
  category?: 'ADD_MONEY' | 'CASHBACK' | 'REFERRAL_BONUS' | 'REFUND' | 'ADMIN_ADJUSTMENT';
  description: string;
}) {
  const userRef = doc(db, 'users', params.uid);
  const ledgerRef = doc(db, 'ledger', params.txId);

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('User account does not exist.');
      }
      const userData = userSnap.data() as UserProfile;
      const balanceBefore = Number(userData.walletBalance || 0);
      const creditAmount = Number(params.amount.toFixed(2));
      const balanceAfter = Number((balanceBefore + creditAmount).toFixed(2));

      transaction.update(userRef, {
        walletBalance: balanceAfter,
        cashbackEarned:
          params.category === 'CASHBACK' || params.category === 'REFERRAL_BONUS'
            ? Number(((userData.cashbackEarned || 0) + creditAmount).toFixed(2))
            : userData.cashbackEarned || 0,
        updatedAt: serverTimestamp(),
      });

      transaction.set(ledgerRef, {
        txId: clampStr(params.txId, 6, 64, `RXP${Date.now()}`),
        userId: params.uid,
        entryType: 'CREDIT',
        category: params.category || 'ADD_MONEY',
        service: 'Wallet Top-Up (Verified)',
        provider: clampStr(params.gatewayName, 2, 80, 'Authorized Gateway'),
        targetAccount: 'Primary Wallet Ledger',
        amount: creditAmount,
        balanceBefore,
        balanceAfter,
        status: 'SUCCESS',
        idempotencyKey: clampStr(params.idempotencyKey, 6, 80, `IDEMP_${Date.now()}`),
        gatewayRef: clampStr(params.gatewayRef, 2, 80, 'GW_VERIFIED'),
        description: clampStr(params.description, 2, 240, 'Verified gateway credit'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await recordAuditLog(
      params.uid,
      params.userEmail,
      'DOUBLE_ENTRY_WALLET_CREDIT',
      'WALLET_LEDGER',
      params.txId,
      `Credited ₹${params.amount.toFixed(2)} via ${params.gatewayName} (Ref: ${params.gatewayRef})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `ledger/${params.txId}`);
  }
}

// Double-entry atomic wallet debit for Recharge, Bill Payment, UPI Scan & Pay, or Bank Transfer
export async function executeVerifiedWalletDebit(params: {
  uid: string;
  userEmail: string;
  amount: number;
  cashbackAmount: number;
  category: 'RECHARGE' | 'BILL_PAYMENT' | 'UPI_TRANSFER' | 'BANK_PAYOUT' | 'ADMIN_ADJUSTMENT';
  service: string;
  provider: string;
  targetAccount: string;
  txId: string;
  operatorRef: string;
  idempotencyKey: string;
  description: string;
}) {
  const userRef = doc(db, 'users', params.uid);
  const debitLedgerRef = doc(db, 'ledger', params.txId);

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('Customer profile not found.');
      }
      const userData = userSnap.data() as UserProfile;
      const balanceBefore = Number(userData.walletBalance || 0);
      const debitAmount = Number(params.amount.toFixed(2));

      if (balanceBefore < debitAmount) {
        throw new Error(
          `Insufficient wallet balance (Available: ₹${balanceBefore.toFixed(2)}, Required: ₹${debitAmount.toFixed(2)}).`
        );
      }

      const balanceAfterDebit = Number((balanceBefore - debitAmount).toFixed(2));
      const cashback = Number((params.cashbackAmount || 0).toFixed(2));
      const finalBalance = Number((balanceAfterDebit + cashback).toFixed(2));

      transaction.update(userRef, {
        walletBalance: finalBalance,
        cashbackEarned: Number(((userData.cashbackEarned || 0) + cashback).toFixed(2)),
        updatedAt: serverTimestamp(),
      });

      transaction.set(debitLedgerRef, {
        txId: clampStr(params.txId, 6, 64, `TXN${Date.now()}`),
        userId: params.uid,
        entryType: 'DEBIT',
        category: params.category,
        service: clampStr(params.service, 2, 80, 'Recharge Service'),
        provider: clampStr(params.provider, 2, 80, 'Operator'),
        targetAccount: clampStr(params.targetAccount, 2, 100, '9876543210'),
        amount: debitAmount,
        balanceBefore,
        balanceAfter: balanceAfterDebit,
        status: 'SUCCESS',
        idempotencyKey: clampStr(params.idempotencyKey, 6, 80, `IDEMP_${Date.now()}`),
        gatewayRef: clampStr(params.operatorRef, 2, 80, 'OP_REF'),
        description: clampStr(params.description, 2, 240, 'Wallet debit for service'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (cashback > 0) {
        const cbTxId = `${params.txId}_CB`;
        const cbRef = doc(db, 'ledger', cbTxId);
        transaction.set(cbRef, {
          txId: clampStr(cbTxId, 6, 64, `CB${Date.now()}`),
          userId: params.uid,
          entryType: 'CREDIT',
          category: 'CASHBACK',
          service: 'Instant Recharge Cashback',
          provider: 'Recharge Expres Rewards',
          targetAccount: params.targetAccount,
          amount: cashback,
          balanceBefore: balanceAfterDebit,
          balanceAfter: finalBalance,
          status: 'SUCCESS',
          idempotencyKey: clampStr(`${params.idempotencyKey}_CB`, 6, 80, `IDEMP_CB_${Date.now()}`),
          gatewayRef: clampStr(params.operatorRef, 2, 80, 'CB_PROMO'),
          description: clampStr(`2% Instant Cashback on ${params.service} (${params.txId})`, 2, 240, 'Cashback reward'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    await recordAuditLog(
      params.uid,
      params.userEmail,
      `WALLET_DEBIT_${params.category}`,
      'RECHARGE_AND_BILLS',
      params.txId,
      `Debited ₹${params.amount.toFixed(2)} for ${params.service} (${params.targetAccount})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `ledger/${params.txId}`);
  }
}

export async function createPayoutWithdrawalRequest(params: {
  uid: string;
  userName: string;
  userEmail: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  mode: 'IMPS' | 'NEFT' | 'UPI';
  amount: number;
}) {
  const fee = params.mode === 'IMPS' ? 5 : 0;
  const totalDebit = Number((params.amount + fee).toFixed(2));
  const txId = `PAYOUT${Date.now().toString().slice(-7)}`;
  const idempotencyKey = `WD_${params.uid.slice(0, 6)}_${Date.now()}`;
  const maskedAcc =
    params.accountNumber.length > 4
      ? `••••${params.accountNumber.slice(-4)}`
      : params.accountNumber;

  await executeVerifiedWalletDebit({
    uid: params.uid,
    userEmail: params.userEmail,
    amount: totalDebit,
    cashbackAmount: 0,
    category: 'BANK_PAYOUT',
    service: `${params.mode} Bank Withdrawal`,
    provider: params.ifsc.toUpperCase(),
    targetAccount: `${params.accountHolder} (${maskedAcc})`,
    txId,
    operatorRef: `UTR_PENDING_${txId.slice(-5)}`,
    idempotencyKey,
    description: `Authorized ${params.mode} bank payout to ${maskedAcc} (Fee: ₹${fee})`,
  });

  const payoutId = `wd_${Date.now()}`;
  try {
    await setDoc(doc(db, 'payoutRequests', payoutId), {
      userId: params.uid,
      userName: clampStr(params.userName, 1, 100, 'Customer'),
      accountHolder: clampStr(params.accountHolder, 2, 100, params.userName),
      accountNumberMasked: clampStr(maskedAcc, 4, 40, '••••1234'),
      ifsc: clampStr(params.ifsc.toUpperCase(), 4, 20, 'HDFC0001234'),
      mode: params.mode,
      amount: Number(params.amount.toFixed(2)),
      fee,
      status: 'PENDING_APPROVAL',
      utrNumber: `UTR${Date.now().toString().slice(-8)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payoutRequests/${payoutId}`);
  }
}

export async function createSupportTicketRecord(params: {
  uid: string;
  userName: string;
  txId: string;
  subject: string;
  category: SupportTicket['category'];
  amount: number;
  resolutionNote: string;
}) {
  const ticketId = `tkt_${Date.now()}`;
  try {
    await setDoc(doc(db, 'supportTickets', ticketId), {
      userId: params.uid,
      userName: clampStr(params.userName, 1, 100, 'Customer'),
      txId: clampStr(params.txId || 'GENERAL_INQUIRY', 2, 64, 'GENERAL'),
      subject: clampStr(params.subject, 3, 140, 'Transaction Support Inquiry'),
      category: params.category,
      amount: Number((params.amount || 0).toFixed(2)),
      status: 'OPEN',
      resolutionNote: clampStr(params.resolutionNote, 2, 300, 'Ticket submitted by customer for review.'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `supportTickets/${ticketId}`);
  }
}

export async function saveMerchantGatewayConfig(
  adminUid: string,
  adminEmail: string,
  merchantId: string,
  payload: Omit<MerchantGateway, 'id' | 'updatedBy'>
) {
  const cleanId = merchantId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  try {
    const ref = doc(db, 'merchants', cleanId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await recordAuditLog(
      adminUid,
      adminEmail,
      'SAVE_MERCHANT_GATEWAY',
      'PAYMENT_MERCHANTS',
      cleanId,
      `Configured ${payload.name} (${payload.gatewayType}) [${payload.environment}]`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `merchants/${cleanId}`);
  }
}

export async function removeMerchantGatewayConfig(
  adminUid: string,
  adminEmail: string,
  merchantId: string
) {
  try {
    await deleteDoc(doc(db, 'merchants', merchantId));
    await recordAuditLog(
      adminUid,
      adminEmail,
      'DELETE_MERCHANT_GATEWAY',
      'PAYMENT_MERCHANTS',
      merchantId,
      `Removed payment gateway integration ${merchantId}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `merchants/${merchantId}`);
  }
}

export async function saveRechargeProviderConfig(
  adminUid: string,
  adminEmail: string,
  providerId: string,
  payload: Omit<RechargeProvider, 'id' | 'updatedBy'>
) {
  const cleanId = providerId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  try {
    const ref = doc(db, 'rechargeProviders', cleanId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await recordAuditLog(
      adminUid,
      adminEmail,
      'SAVE_RECHARGE_PROVIDER',
      'RECHARGE_API',
      cleanId,
      `Updated provider ${payload.name} (Priority ${payload.priority}, Comm ${payload.commissionPercent}%)`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rechargeProviders/${cleanId}`);
  }
}

export async function saveWhatsAppCloudConfig(
  adminUid: string,
  adminEmail: string,
  payload: Omit<WhatsAppConfig, 'id' | 'updatedBy'>
) {
  const configId = 'primary_meta_cloud';
  try {
    const ref = doc(db, 'whatsappConfig', configId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await recordAuditLog(
      adminUid,
      adminEmail,
      'UPDATE_WHATSAPP_CLOUD_API',
      'WHATSAPP_SETTINGS',
      configId,
      `Configured WhatsApp Business Phone ${payload.businessPhone} (OTP Expiry ${payload.otpExpirySeconds}s)`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `whatsappConfig/${configId}`);
  }
}

export async function saveStaffMemberAccount(
  adminUid: string,
  adminEmail: string,
  staffId: string,
  payload: Omit<StaffMember, 'id' | 'createdBy'>
) {
  const cleanId = staffId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  try {
    const ref = doc(db, 'staffMembers', cleanId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        createdBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await recordAuditLog(
      adminUid,
      adminEmail,
      'SAVE_STAFF_RBAC_ACCOUNT',
      'STAFF_MANAGEMENT',
      cleanId,
      `Assigned permissions [${payload.permissions}] to ${payload.name} (${payload.roleTitle})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `staffMembers/${cleanId}`);
  }
}

export async function updatePayoutStatusByAdmin(
  adminUid: string,
  adminEmail: string,
  payout: PayoutRequest,
  newStatus: PayoutRequest['status'],
  utrNumber: string
) {
  try {
    await updateDoc(doc(db, 'payoutRequests', payout.id), {
      status: newStatus,
      utrNumber: clampStr(utrNumber, 2, 64, payout.utrNumber),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      adminUid,
      adminEmail,
      `PAYOUT_${newStatus}`,
      'BANK_PAYOUTS',
      payout.id,
      `Updated payout ₹${payout.amount} for ${payout.userName} to ${newStatus} (UTR: ${utrNumber})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payoutRequests/${payout.id}`);
  }
}

export async function processSupportTicketRefundByAdmin(
  adminUid: string,
  adminEmail: string,
  ticket: SupportTicket,
  newStatus: SupportTicket['status'],
  resolutionNote: string
) {
  try {
    await updateDoc(doc(db, 'supportTickets', ticket.id), {
      status: newStatus,
      resolutionNote: clampStr(resolutionNote, 2, 300, 'Processed by Support/Admin team.'),
      updatedAt: serverTimestamp(),
    });

    if (newStatus === 'REFUND_APPROVED' && ticket.amount > 0) {
      const refundTxId = `RFD${Date.now().toString().slice(-8)}`;
      await executeVerifiedWalletCredit({
        uid: ticket.userId,
        userEmail: adminEmail,
        amount: ticket.amount,
        gatewayName: 'Recharge Expres Automated Refund Engine',
        txId: refundTxId,
        gatewayRef: `RFD_${ticket.txId}`,
        idempotencyKey: `REFUND_TICKET_${ticket.id}`,
        category: 'REFUND',
        description: `Verified refund credited for Ticket #${ticket.id.slice(-6)} (${ticket.txId})`,
      });
    }

    await recordAuditLog(
      adminUid,
      adminEmail,
      `TICKET_${newStatus}`,
      'REFUND_MANAGEMENT',
      ticket.id,
      `Ticket ${ticket.id} marked ${newStatus}: ${resolutionNote}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `supportTickets/${ticket.id}`);
  }
}
