import React, { useState, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  Send,
  Landmark,
  QrCode,
  History,
  Smartphone,
  Tv,
  Zap,
  Flame,
  Droplets,
  Wifi,
  Phone,
  ShieldCheck,
  Plane,
  Grid,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Lock,
  Receipt,
  X,
  RefreshCw,
  Volume2,
  Home,
  User,
  Bell,
  ChevronRight,
} from 'lucide-react';
import {
  UserProfile,
  LedgerEntry,
  MerchantGateway,
  PayoutRequest,
  SupportTicket,
} from '../types/fintech.ts';
import { SERVICE_OPERATORS, PREPAID_PLANS } from '../data/deliverables.ts';
import {
  executeVerifiedWalletCredit,
  executeVerifiedWalletDebit,
  createPayoutWithdrawalRequest,
  createSupportTicketRecord,
} from '../services/firestoreService.ts';
import { CustomerSpendingAnalytics } from './CustomerSpendingAnalytics.tsx';
import {
  RechargeSuccessTrainModal,
  RechargeSuccessCelebrationData,
} from './RechargeSuccessTrainModal.tsx';

interface CustomerSuperAppViewProps {
  user: UserProfile;
  ledger: LedgerEntry[];
  merchants: MerchantGateway[];
  payouts: PayoutRequest[];
  tickets: SupportTicket[];
  isSignedIn: boolean;
  onRequireSignIn: () => void;
  onUpdateUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onPrependLedger: (entries: LedgerEntry[]) => void;
  onPrependPayout: (payout: PayoutRequest) => void;
  onPrependTicket: (ticket: SupportTicket) => void;
  onNavigateView?: (
    view: 'SUPER_APP' | 'SUPER_ADMIN' | 'STAFF_PANEL' | 'DELIVERABLES' | 'LEGAL'
  ) => void;
}

export const CustomerSuperAppView: React.FC<CustomerSuperAppViewProps> = ({
  user,
  ledger,
  merchants,
  payouts,
  tickets,
  isSignedIn,
  onRequireSignIn,
  onUpdateUser,
  onPrependLedger,
  onPrependPayout,
  onPrependTicket,
  onNavigateView,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [mobileBottomTab, setMobileBottomTab] = useState<
    'Home' | 'History' | 'Scan' | 'Offers' | 'Profile'
  >('Home');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'RECHARGE' | 'ADD_MONEY' | 'UPI_SCAN' | 'BANK_TRANSFER' | 'WHATSAPP_OTP' | 'SUPPORT'
  >('RECHARGE');
  const [mobileQuickPayOpen, setMobileQuickPayOpen] = useState<boolean>(true);

  const consoleSectionRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const offersSectionRef = useRef<HTMLDivElement | null>(null);

  // Recharge & Bill Payment Form State
  const [selectedService, setSelectedService] = useState<string>('Mobile Prepaid');
  const [selectedOperator, setSelectedOperator] = useState<string>('Jio True 5G');
  const [targetNumber, setTargetNumber] = useState<string>('9876543210');
  const [rechargeAmount, setRechargeAmount] = useState<string>('299');
  const [processingTx, setProcessingTx] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [receiptModal, setReceiptModal] = useState<LedgerEntry | null>(null);
  const [trainCelebration, setTrainCelebration] =
    useState<RechargeSuccessCelebrationData | null>(null);

  // Add Money State
  const [topupAmount, setTopupAmount] = useState<string>('1000');
  const [selectedGateway, setSelectedGateway] = useState<string>(
    merchants.find((m) => m.isDefault)?.name || 'Paytm Payment Gateway'
  );
  const [verificationMode, setVerificationMode] = useState<'WEBHOOK_HMAC' | 'SCREENSHOT'>(
    'WEBHOOK_HMAC'
  );

  // UPI Scan & Send Money State
  const [upiVpa, setUpiVpa] = useState<string>('merchant.store@okaxis');
  const [upiAmount, setUpiAmount] = useState<string>('450');
  const [upiNote, setUpiNote] = useState<string>('Retail Store QR Payment');

  // Bank Transfer / Withdrawal State
  const [beneficiaryName, setBeneficiaryName] = useState<string>(
    user.name || 'Account Holder'
  );
  const [accountNumber, setAccountNumber] = useState<string>('501004829102');
  const [ifscCode, setIfscCode] = useState<string>('HDFC0001234');
  const [transferMode, setTransferMode] = useState<'IMPS' | 'NEFT' | 'UPI'>('IMPS');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');

  // WhatsApp OTP Verification State
  const [otpPhone, setOtpPhone] = useState<string>(user.phone || '9876543210');
  const [otpInput, setOtpInput] = useState<string>('');
  const [sandboxOtpPreview, setSandboxOtpPreview] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState<boolean>(user.kycStatus === 'VERIFIED');

  // Support Ticket State
  const [ticketTxId, setTicketTxId] = useState<string>(ledger[0]?.txId || 'RXP100291');
  const [ticketCategory, setTicketCategory] =
    useState<SupportTicket['category']>('RECHARGE_DISPUTE');
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketAmount, setTicketAmount] = useState<string>('299');

  const [copiedCode, setCopiedCode] = useState(false);

  const openModule = (
    tab:
      | 'RECHARGE'
      | 'ADD_MONEY'
      | 'UPI_SCAN'
      | 'BANK_TRANSFER'
      | 'WHATSAPP_OTP'
      | 'SUPPORT'
  ) => {
    setActiveWorkspaceTab(tab);
    setTimeout(() => {
      consoleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleSelectService = (serviceName: string) => {
    setSelectedService(serviceName);
    const ops = SERVICE_OPERATORS[serviceName] || ['Standard BBPS Biller'];
    setSelectedOperator(ops[0]);
    if (serviceName.includes('Electricity')) {
      setRechargeAmount('1240');
    } else if (serviceName.includes('DTH')) {
      setRechargeAmount('350');
    } else if (serviceName.includes('Gas')) {
      setRechargeAmount('850');
    } else if (serviceName.includes('Water')) {
      setRechargeAmount('420');
    } else if (serviceName.includes('Broadband')) {
      setRechargeAmount('799');
    } else {
      setRechargeAmount('299');
    }
    setActiveWorkspaceTab('RECHARGE');
    setMobileQuickPayOpen(true);
  };

  // 1. Handle Verified Add Money (Double-Entry Credit)
  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingTx(true);
    setStatusBanner(null);

    try {
      const creditAmt = Number(topupAmount);
      const idempotencyKey = `ADD_${user.uid.slice(0, 6)}_${Date.now()}`;
      const res = await fetch('/api/webhooks/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: selectedGateway,
          orderId: `ORD_${Date.now()}`,
          amount: creditAmt,
          idempotencyKey,
          verificationMethod: verificationMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.error || 'Gateway webhook signature verification failed.');
      }

      const balanceBefore = Number(user.walletBalance || 0);
      const balanceAfter = Number((balanceBefore + creditAmt).toFixed(2));

      if (isSignedIn) {
        await executeVerifiedWalletCredit({
          uid: user.uid,
          userEmail: user.email,
          amount: creditAmt,
          gatewayName: selectedGateway,
          txId: data.txId,
          gatewayRef: data.gatewayRef,
          idempotencyKey,
          category: 'ADD_MONEY',
          description: `Verified wallet top-up via ${selectedGateway} (HMAC: ${data.hmacSignature.slice(0, 10)})`,
        });
      } else {
        onUpdateUser((prev) => ({
          ...prev,
          walletBalance: balanceAfter,
        }));
        onPrependLedger([
          {
            id: data.txId,
            txId: data.txId,
            userId: user.uid,
            entryType: 'CREDIT',
            category: 'ADD_MONEY',
            service: 'Wallet Top-Up (Verified)',
            provider: selectedGateway,
            targetAccount: 'Primary Wallet Ledger',
            amount: creditAmt,
            balanceBefore,
            balanceAfter,
            status: 'SUCCESS',
            idempotencyKey,
            gatewayRef: data.gatewayRef,
            description: `Verified wallet top-up via ${selectedGateway} (HMAC: ${data.hmacSignature.slice(0, 10)})`,
          },
        ]);
      }

      setStatusBanner({
        type: 'success',
        message: `₹${creditAmt.toFixed(2)} credited to wallet after cryptographic webhook verification (TX: ${data.txId}).`,
      });
      setTrainCelebration({
        txId: data.txId,
        service: 'Verified Wallet Top-Up',
        provider: selectedGateway,
        targetAccount: 'Primary Wallet Ledger',
        amount: creditAmt,
        cashbackAmount: 0,
        operatorRef: data.gatewayRef,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'Payment verification failed.',
      });
    } finally {
      setProcessingTx(false);
    }
  };

  // 2. Handle Recharge or Bill Payment (Double-Entry Debit + Cashback Credit)
  const handleRechargeOrBillPay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProcessingTx(true);
    setStatusBanner(null);

    try {
      const debitAmt = Number(rechargeAmount);
      const balanceBefore = Number(user.walletBalance || 0);
      if (balanceBefore < debitAmt) {
        throw new Error(
          `Insufficient wallet balance (Available: ₹${balanceBefore.toFixed(2)}, Required: ₹${debitAmt.toFixed(2)}). Please tap 'Add Money' first.`
        );
      }

      const idempotencyKey = `RCH_${user.uid.slice(0, 6)}_${Date.now()}`;
      const res = await fetch('/api/recharge/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedService,
          provider: selectedOperator,
          targetAccount: targetNumber,
          amount: debitAmt,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Recharge validation failed.');
      }

      const isBill =
        selectedService.includes('Bill') ||
        selectedService.includes('Postpaid') ||
        selectedService.includes('Broadband') ||
        selectedService.includes('Landline') ||
        selectedService.includes('Insurance');

      const cashbackAmt = Number(data.cashbackAmount || 0);
      const balanceAfterDebit = Number((balanceBefore - debitAmt).toFixed(2));
      const finalBalance = Number((balanceAfterDebit + cashbackAmt).toFixed(2));

      if (isSignedIn) {
        await executeVerifiedWalletDebit({
          uid: user.uid,
          userEmail: user.email,
          amount: debitAmt,
          cashbackAmount: cashbackAmt,
          category: isBill ? 'BILL_PAYMENT' : 'RECHARGE',
          service: selectedService,
          provider: selectedOperator,
          targetAccount: targetNumber,
          txId: data.txId,
          operatorRef: data.operatorRef,
          idempotencyKey,
          description: `${selectedService} for ${targetNumber} via ${selectedOperator}`,
        });
      } else {
        onUpdateUser((prev) => ({
          ...prev,
          walletBalance: finalBalance,
          cashbackEarned: Number(((prev.cashbackEarned || 0) + cashbackAmt).toFixed(2)),
        }));

        const newEntries: LedgerEntry[] = [
          {
            id: data.txId,
            txId: data.txId,
            userId: user.uid,
            entryType: 'DEBIT',
            category: isBill ? 'BILL_PAYMENT' : 'RECHARGE',
            service: selectedService,
            provider: selectedOperator,
            targetAccount: targetNumber,
            amount: debitAmt,
            balanceBefore,
            balanceAfter: balanceAfterDebit,
            status: 'SUCCESS',
            idempotencyKey,
            gatewayRef: data.operatorRef,
            description: `${selectedService} for ${targetNumber} via ${selectedOperator}`,
          },
        ];

        if (cashbackAmt > 0) {
          newEntries.unshift({
            id: `${data.txId}_CB`,
            txId: `${data.txId}_CB`,
            userId: user.uid,
            entryType: 'CREDIT',
            category: 'CASHBACK',
            service: 'Instant Recharge Cashback',
            provider: 'Recharge Expres Rewards',
            targetAccount: targetNumber,
            amount: cashbackAmt,
            balanceBefore: balanceAfterDebit,
            balanceAfter: finalBalance,
            status: 'SUCCESS',
            idempotencyKey: `${idempotencyKey}_CB`,
            gatewayRef: data.operatorRef,
            description: `2% Instant Cashback on ${selectedService} (${data.txId})`,
          });
        }
        onPrependLedger(newEntries);
      }

      setStatusBanner({
        type: 'success',
        message: `${selectedService} of ₹${debitAmt.toFixed(2)} successful! Instant Cashback ₹${cashbackAmt.toFixed(2)} credited (Ref: ${data.operatorRef}).`,
      });
      setTrainCelebration({
        txId: data.txId,
        service: selectedService,
        provider: selectedOperator,
        targetAccount: targetNumber,
        amount: debitAmt,
        cashbackAmount: cashbackAmt,
        operatorRef: data.operatorRef,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'Recharge execution failed.',
      });
    } finally {
      setProcessingTx(false);
    }
  };

  // 3. Handle UPI Scan & Pay
  const handleUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingTx(true);
    setStatusBanner(null);

    try {
      const amt = Number(upiAmount);
      if (!upiVpa.includes('@') || amt <= 0) {
        throw new Error('Enter a valid UPI ID (e.g., name@upi) and positive amount.');
      }
      const balanceBefore = Number(user.walletBalance || 0);
      if (balanceBefore < amt) {
        throw new Error(`Insufficient wallet balance (Available: ₹${balanceBefore.toFixed(2)}).`);
      }

      const txId = `UPI${Date.now().toString().slice(-8)}`;
      const operatorRef = `UPI_RRN_${Date.now().toString().slice(-9)}`;
      const idempotencyKey = `UPI_${user.uid.slice(0, 6)}_${Date.now()}`;
      const balanceAfter = Number((balanceBefore - amt).toFixed(2));

      if (isSignedIn) {
        await executeVerifiedWalletDebit({
          uid: user.uid,
          userEmail: user.email,
          amount: amt,
          cashbackAmount: 0,
          category: 'UPI_TRANSFER',
          service: 'UPI Scan & Pay',
          provider: 'NPCI UPI PSP Partner',
          targetAccount: upiVpa.trim(),
          txId,
          operatorRef,
          idempotencyKey,
          description: `${upiNote || 'UPI Payment'} to ${upiVpa}`,
        });
      } else {
        onUpdateUser((prev) => ({ ...prev, walletBalance: balanceAfter }));
        onPrependLedger([
          {
            id: txId,
            txId,
            userId: user.uid,
            entryType: 'DEBIT',
            category: 'UPI_TRANSFER',
            service: 'UPI Scan & Pay',
            provider: 'NPCI UPI PSP Partner',
            targetAccount: upiVpa.trim(),
            amount: amt,
            balanceBefore,
            balanceAfter,
            status: 'SUCCESS',
            idempotencyKey,
            gatewayRef: operatorRef,
            description: `${upiNote || 'UPI Payment'} to ${upiVpa}`,
          },
        ]);
      }

      setStatusBanner({
        type: 'success',
        message: `UPI transfer of ₹${amt.toFixed(2)} to ${upiVpa} settled (TX: ${txId}).`,
      });
      setTrainCelebration({
        txId,
        service: 'UPI Scan & Pay',
        provider: 'NPCI UPI PSP Partner',
        targetAccount: upiVpa.trim(),
        amount: amt,
        cashbackAmount: 0,
        operatorRef,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'UPI transfer failed.',
      });
    } finally {
      setProcessingTx(false);
    }
  };

  // 4. Handle Authorized Bank Withdrawal
  const handleBankWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingTx(true);
    setStatusBanner(null);

    try {
      const amt = Number(withdrawAmount);
      if (amt < 100) {
        throw new Error('Minimum bank payout amount is ₹100.');
      }
      const fee = transferMode === 'IMPS' ? 5 : 0;
      const totalDebit = amt + fee;
      const balanceBefore = Number(user.walletBalance || 0);
      if (balanceBefore < totalDebit) {
        throw new Error(`Insufficient wallet balance for ₹${amt} + ₹${fee} fee.`);
      }

      if (isSignedIn) {
        await createPayoutWithdrawalRequest({
          uid: user.uid,
          userName: user.name,
          userEmail: user.email,
          accountHolder: beneficiaryName,
          accountNumber,
          ifsc: ifscCode,
          mode: transferMode,
          amount: amt,
        });
      } else {
        const txId = `PAYOUT${Date.now().toString().slice(-7)}`;
        const balanceAfter = Number((balanceBefore - totalDebit).toFixed(2));
        const maskedAcc =
          accountNumber.length > 4 ? `••••${accountNumber.slice(-4)}` : accountNumber;
        onUpdateUser((prev) => ({ ...prev, walletBalance: balanceAfter }));
        onPrependLedger([
          {
            id: txId,
            txId,
            userId: user.uid,
            entryType: 'DEBIT',
            category: 'BANK_PAYOUT',
            service: `${transferMode} Bank Withdrawal`,
            provider: ifscCode.toUpperCase(),
            targetAccount: `${beneficiaryName} (${maskedAcc})`,
            amount: totalDebit,
            balanceBefore,
            balanceAfter,
            status: 'SUCCESS',
            idempotencyKey: `WD_${Date.now()}`,
            gatewayRef: `UTR_${txId.slice(-6)}`,
            description: `Authorized ${transferMode} bank payout to ${maskedAcc}`,
          },
        ]);
        onPrependPayout({
          id: `wd_${Date.now()}`,
          userId: user.uid,
          userName: user.name,
          accountHolder: beneficiaryName,
          accountNumberMasked: maskedAcc,
          ifsc: ifscCode.toUpperCase(),
          mode: transferMode,
          amount: amt,
          fee,
          status: 'PENDING_APPROVAL',
          utrNumber: `UTR${Date.now().toString().slice(-8)}`,
        });
      }

      setStatusBanner({
        type: 'success',
        message: `Bank payout request of ₹${amt.toFixed(2)} via ${transferMode} submitted to authorized payout partner.`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err.message || 'Bank withdrawal failed.',
      });
    } finally {
      setProcessingTx(false);
    }
  };

  // 5. Handle WhatsApp OTP Send & Verify
  const handleSendWhatsAppOtp = async () => {
    setProcessingTx(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: otpPhone,
          purpose: 'CUSTOMER_MOBILE_VERIFICATION',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP dispatch failed.');
      if (data.sandboxOtpPreview) {
        setSandboxOtpPreview(data.sandboxOtpPreview);
        setOtpInput(data.sandboxOtpPreview);
      }
      setStatusBanner({
        type: 'success',
        message: `WhatsApp OTP dispatched to +91 ${otpPhone} (${data.remainingResends} resends left in 10m window).`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', message: err.message });
    } finally {
      setProcessingTx(false);
    }
  };

  const handleVerifyWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingTx(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone, otp: otpInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'OTP verification failed.');
      setOtpVerified(true);
      setSandboxOtpPreview(null);
      setStatusBanner({
        type: 'success',
        message: `Mobile number +91 ${otpPhone} verified via WhatsApp OTP!`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', message: err.message });
    } finally {
      setProcessingTx(false);
    }
  };

  // 6. Handle Support Ticket Creation
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingTx(true);
    setStatusBanner(null);
    try {
      if (isSignedIn) {
        await createSupportTicketRecord({
          uid: user.uid,
          userName: user.name,
          txId: ticketTxId,
          subject: ticketSubject || `${ticketCategory} regarding TX ${ticketTxId}`,
          category: ticketCategory,
          amount: Number(ticketAmount) || 0,
          resolutionNote: 'Submitted by customer via Super App Support Center.',
        });
      } else {
        onPrependTicket({
          id: `tkt_${Date.now()}`,
          userId: user.uid,
          userName: user.name,
          txId: ticketTxId,
          subject: ticketSubject || `${ticketCategory} regarding TX ${ticketTxId}`,
          category: ticketCategory,
          amount: Number(ticketAmount) || 0,
          status: 'OPEN',
          resolutionNote: 'Submitted by customer via Super App Support Center.',
        });
      }
      setTicketSubject('');
      setStatusBanner({
        type: 'success',
        message: 'Support ticket logged and routed to Staff & Refund Desk.',
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', message: err.message });
    } finally {
      setProcessingTx(false);
    }
  };

  const serviceGridItems = [
    {
      label: 'Mobile Prepaid',
      icon: Smartphone,
      tint: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
    },
    {
      label: 'DTH Recharge',
      icon: Tv,
      tint: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400',
    },
    {
      label: 'Electricity Bill',
      icon: Zap,
      tint: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
    },
    {
      label: 'Gas Bill',
      icon: Flame,
      tint: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
    },
    {
      label: 'Water Bill',
      icon: Droplets,
      tint: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 dark:text-cyan-400',
    },
    {
      label: 'Broadband',
      icon: Wifi,
      tint: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400',
    },
    {
      label: 'Landline',
      icon: Phone,
      tint: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
      label: 'Insurance',
      icon: ShieldCheck,
      tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    {
      label: 'Fastag & Travel',
      icon: Plane,
      tint: 'text-violet-600 bg-violet-50 dark:bg-violet-950/60 dark:text-violet-400',
    },
    {
      label: 'Mobile Postpaid',
      icon: Grid,
      tint: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400',
    },
  ];

  return (
    <div className="w-full pb-28">
      {/* EDGE-TO-EDGE NATIVE ANDROID & iOS HERO HEADER + WALLET BANNER */}
      <section className="w-full bg-gradient-to-b from-[#0039A6] via-[#0047CC] to-[#002D85] text-white pt-4 pb-6 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* App Brand Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shadow-inner">
                <Zap className="w-6 h-6 fill-amber-400 text-amber-300" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">
                  Recharge <span className="text-amber-300">Expres</span>
                </div>
                <div className="text-xs text-blue-100 mt-1 font-medium">
                  Fast • Secure • Reliable
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openModule('WHATSAPP_OTP')}
                className="relative w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                title="Notifications & WhatsApp Alerts"
              >
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileBottomTab('Profile');
                  openModule('WHATSAPP_OTP');
                }}
                className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center font-extrabold text-sm text-white hover:bg-white/30 transition-colors"
                title="Customer Profile & KYC"
              >
                {(user.name || 'R').charAt(0).toUpperCase()}
              </button>
            </div>
          </div>

          {/* Native Edge-to-Edge Wallet Balance Card */}
          <div className="rounded-3xl bg-gradient-to-r from-[#0066FF] via-[#0052FF] to-[#0039A6] p-5 border border-white/25 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-100 font-semibold">
                  <span>Wallet Balance</span>
                  <button
                    type="button"
                    onClick={() => setShowBalance(!showBalance)}
                    className="hover:text-white transition-colors p-0.5"
                    aria-label="Toggle wallet balance visibility"
                  >
                    {showBalance ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight mt-1">
                  {showBalance
                    ? `₹${Number(user.walletBalance || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : '₹••••••'}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-300 font-semibold mt-2">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    KYC Verified
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-amber-200">
                    Cashback Earned: ₹{Number(user.cashbackEarned || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openModule('ADD_MONEY')}
                className="px-5 py-3 rounded-full bg-white text-[#0039A6] font-extrabold text-xs sm:text-sm shadow-md hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Add Money</span>
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN EDGE-TO-EDGE NATIVE APP CONTENT */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 space-y-5">
        {/* Status Feedback Banner */}
        {statusBanner && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{statusBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs font-bold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 4-Action Quick Money Transfer Bar (Send Money · Bank Transfer · Scan & Pay · Transaction History) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
          <button
            type="button"
            onClick={() => openModule('UPI_SCAN')}
            className="flex flex-col items-center justify-center gap-1.5 py-1 hover:text-blue-600 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight text-center">
              Send Money
            </span>
          </button>

          <button
            type="button"
            onClick={() => openModule('BANK_TRANSFER')}
            className="flex flex-col items-center justify-center gap-1.5 py-1 hover:text-blue-600 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight text-center">
              Bank Transfer
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileBottomTab('Scan');
              openModule('UPI_SCAN');
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-1 hover:text-blue-600 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight text-center">
              Scan & Pay
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileBottomTab('History');
              historySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-1 hover:text-blue-600 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight text-center">
              Transaction History
            </span>
          </button>
        </div>

        {/* RESPONSIVE NATIVE APP GRID: Recharges & Quick-Pay + Full Service Execution Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / PRIMARY MOBILE COLUMN: 10-Service BBPS Grid + Instant Quick-Pay + Cashback Offers */}
          <div className="lg:col-span-5 space-y-5">
            {/* 10-Service BBPS & Recharge Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Recharges & Bill Payments
                </span>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  BBPS Verified
                </span>
              </div>

              <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                {serviceGridItems.map((item) => {
                  const IconComponent = item.icon;
                  const isSelected = selectedService === item.label;
                  return (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() => handleSelectService(item.label)}
                      className="flex flex-col items-center text-center group active:scale-95 transition-transform"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                          item.tint
                        } ${
                          isSelected
                            ? 'ring-2 ring-blue-600 dark:ring-blue-400 shadow-xs'
                            : ''
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1.5 leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Instant 1-Tap Recharge & Bill Pay Drawer */}
              {mobileQuickPayOpen && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      Instant {selectedService}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {selectedOperator}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <input
                      type="text"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      placeholder="Mobile / Consumer ID"
                      className="col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min={10}
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      placeholder="₹ Amt"
                      className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={processingTx}
                    onClick={() => handleRechargeOrBillPay()}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {processingTx ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                    )}
                    <span>
                      Pay {selectedService} ₹{Number(rechargeAmount || 0).toFixed(0)} Now
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Promotional 5% Cashback Banner & Latest Offers */}
            <div ref={offersSectionRef} className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-r from-[#0039A6] via-[#0052FF] to-[#0284C7] p-5 text-white flex items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="text-xs text-blue-100 font-semibold">Get up to</div>
                  <div className="text-2xl font-extrabold tracking-tight mt-0.5">
                    <span className="text-amber-300 font-mono">5%</span> Cashback
                  </div>
                  <div className="text-xs text-blue-100 mt-1">
                    on Every Verified Prepaid & BBPS Recharge
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRechargeOrBillPay()}
                  disabled={processingTx}
                  className="px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  Recharge Now →
                </button>
              </div>

              {/* Latest Offers Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      Flat 10% Cashback & Referral Bonus
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Referral Code:{' '}
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {user.referralCode}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(user.referralCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT / FULL SERVICE CONSOLE + ANALYTICS + LEDGER */}
          <div ref={consoleSectionRef} className="lg:col-span-7 space-y-6">
            {/* Interactive Module Switcher */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
                {[
                  { id: 'RECHARGE', label: 'Recharge & Bills' },
                  { id: 'ADD_MONEY', label: 'Add Money (PG)' },
                  { id: 'UPI_SCAN', label: 'UPI Scan & Pay' },
                  { id: 'BANK_TRANSFER', label: 'Bank Withdrawal' },
                  { id: 'WHATSAPP_OTP', label: 'WhatsApp OTP' },
                  { id: 'SUPPORT', label: 'Support & Disputes' },
                ].map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveWorkspaceTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      activeWorkspaceTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* MODULE 1: RECHARGE & BBPS BILL PAYMENT */}
              {activeWorkspaceTab === 'RECHARGE' && (
                <form onSubmit={handleRechargeOrBillPay} className="pt-5 space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        {selectedService} — Instant Operator & BBPS Execution
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Debits verified wallet balance with idempotency protection and automatic refund on failure.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold shrink-0">
                      2% Instant Cashback
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Service Category
                      </label>
                      <select
                        value={selectedService}
                        onChange={(e) => handleSelectService(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      >
                        {Object.keys(SERVICE_OPERATORS).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Authorized Operator / Biller
                      </label>
                      <select
                        value={selectedOperator}
                        onChange={(e) => setSelectedOperator(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      >
                        {(SERVICE_OPERATORS[selectedService] || []).map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mobile / Consumer / Subscriber ID
                      </label>
                      <input
                        type="text"
                        required
                        value={targetNumber}
                        onChange={(e) => setTargetNumber(e.target.value)}
                        placeholder="Enter 10-digit mobile or consumer ID"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={50000}
                        required
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Operator Plan Selector */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Popular Operator Plans (Tap to autofill)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {PREPAID_PLANS.slice(0, 3).map((plan) => (
                        <button
                          type="button"
                          key={plan.id}
                          onClick={() => setRechargeAmount(String(plan.amount))}
                          className={`text-left p-3 rounded-xl border transition-colors ${
                            Number(rechargeAmount) === plan.amount
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                              ₹{plan.amount}
                            </span>
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                              {plan.tag}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            {plan.data} · {plan.validity}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Available Wallet:{' '}
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        ₹{Number(user.walletBalance || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setTrainCelebration({
                            txId: `BBPS${Date.now().toString().slice(-8)}`,
                            service: selectedService,
                            provider: selectedOperator,
                            targetAccount: targetNumber,
                            amount: Number(rechargeAmount) || 299,
                            cashbackAmount: Number(
                              ((Number(rechargeAmount) || 299) * 0.02).toFixed(2)
                            ),
                            operatorRef: `OP_EXP_${Date.now().toString().slice(-6)}`,
                          })
                        }
                        className="px-4 py-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-500/40 text-amber-900 dark:text-amber-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Train Sound</span>
                      </button>
                      <button
                        type="submit"
                        disabled={processingTx}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                      >
                        {processingTx && <RefreshCw className="w-4 h-4 animate-spin" />}
                        <span>
                          Pay ₹{Number(rechargeAmount || 0).toFixed(2)} Now
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* MODULE 2: ADD MONEY VIA AUTHORIZED PAYMENT GATEWAYS */}
              {activeWorkspaceTab === 'ADD_MONEY' && (
                <form onSubmit={handleAddMoney} className="pt-5 space-y-5">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      Add Money to Wallet — Cryptographic Webhook Verification
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Wallet credits require HMAC-SHA256 gateway callback verification. Screenshot or SMS claims are strictly rejected.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Top-Up Amount (₹)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={200000}
                        required
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                      <div className="flex gap-2 mt-2">
                        {[500, 1000, 2000, 5000].map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => setTopupAmount(String(preset))}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                          >
                            +₹{preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Authorized Payment Merchant Gateway
                      </label>
                      <select
                        value={selectedGateway}
                        onChange={(e) => setSelectedGateway(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                      >
                        {merchants
                          .filter((m) => m.enabled)
                          .map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name} ({m.gatewayType} · {m.environment})
                            </option>
                          ))}
                        {merchants.length === 0 && (
                          <>
                            <option value="Paytm Payment Gateway">Paytm Payment Gateway</option>
                            <option value="Razorpay Enterprise PG">Razorpay Enterprise PG</option>
                            <option value="PhonePe Payment Gateway">PhonePe Payment Gateway</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Callback Verification Protocol
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="verifMode"
                          checked={verificationMode === 'WEBHOOK_HMAC'}
                          onChange={() => setVerificationMode('WEBHOOK_HMAC')}
                        />
                        <span>Authorized Gateway HMAC-SHA256 Webhook (Compliant)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="verifMode"
                          checked={verificationMode === 'SCREENSHOT'}
                          onChange={() => setVerificationMode('SCREENSHOT')}
                        />
                        <span>Unverified Screenshot / SMS Claim (Test Security Rejection)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={processingTx}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Verify & Credit ₹{Number(topupAmount || 0).toFixed(2)}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* MODULE 3: UPI SCAN & PAY */}
              {activeWorkspaceTab === 'UPI_SCAN' && (
                <form onSubmit={handleUpiPayment} className="pt-5 space-y-5">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      UPI Scan & Pay / VPA Intent Transfer
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Scan any BharatQR / Merchant UPI QR or enter a verified VPA.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center text-center">
                      <QrCode className="w-20 h-20 text-blue-600 dark:text-blue-400 mb-2" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        BharatQR / UPI Scanner
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUpiVpa('supermarket.pos@paytm');
                          setUpiAmount('640');
                          setUpiNote('BharatQR POS Invoice #9481');
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold"
                      >
                        Simulate QR Scan
                      </button>
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Payee UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          required
                          value={upiVpa}
                          onChange={(e) => setUpiVpa(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Amount (₹)
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={upiAmount}
                            onChange={(e) => setUpiAmount(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Payment Remarks
                          </label>
                          <input
                            type="text"
                            value={upiNote}
                            onChange={(e) => setUpiNote(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={processingTx}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors"
                    >
                      Send ₹{Number(upiAmount || 0).toFixed(2)} via Verified UPI Partner
                    </button>
                  </div>
                </form>
              )}

              {/* MODULE 4: BANK TRANSFER / WALLET WITHDRAWAL */}
              {activeWorkspaceTab === 'BANK_TRANSFER' && (
                <form onSubmit={handleBankWithdrawal} className="pt-5 space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      Wallet to Bank Transfer — Authorized Payout Partner
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Creates a double-entry debit and routes settlement through authorized IMPS/NEFT/UPI payout rails.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        required
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Mode
                        </label>
                        <select
                          value={transferMode}
                          onChange={(e) => setTransferMode(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="IMPS">IMPS (₹5 Fee)</option>
                          <option value="NEFT">NEFT (₹0 Fee)</option>
                          <option value="UPI">UPI (₹0 Fee)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          min={100}
                          required
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={processingTx}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs"
                    >
                      Initiate Authorized Bank Payout
                    </button>
                  </div>
                </form>
              )}

              {/* MODULE 5: WHATSAPP BUSINESS OTP & PROFILE */}
              {activeWorkspaceTab === 'WHATSAPP_OTP' && (
                <div className="pt-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        Customer Profile, KYC & WhatsApp OTP Verification
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Official Meta Cloud API template verification with 300s expiry and 3-attempt rate limiting.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {otpVerified ? 'Mobile Verified' : 'Verification Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Customer Mobile Number (+91)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={otpPhone}
                          onChange={(e) => setOtpPhone(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSendWhatsAppOtp}
                          disabled={processingTx}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          Send OTP
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleVerifyWhatsAppOtp}>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        6-Digit OTP Code{' '}
                        {sandboxOtpPreview ? `(Code: ${sandboxOtpPreview})` : ''}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          disabled={processingTx || !otpInput}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          Verify OTP
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Quick Navigation to Admin, Staff, APK & Legal Views on Mobile */}
                  {onNavigateView && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                        Platform Consoles & Legal Policies
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigateView('SUPER_ADMIN')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <span>Super Admin</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateView('STAFF_PANEL')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <span>Staff Panel</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateView('DELIVERABLES')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <span>APK & Source</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateView('LEGAL')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <span>Legal & Terms</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 6: CUSTOMER SUPPORT & REFUND DISPUTES */}
              {activeWorkspaceTab === 'SUPPORT' && (
                <form onSubmit={handleCreateTicket} className="pt-5 space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      24x7 Customer Support & Automated Refund Desk
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Raise a dispute for pending recharges or failed debits. Tickets sync directly to the Staff & Admin Panels.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketTxId}
                        onChange={(e) => setTicketTxId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Issue Type
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="RECHARGE_DISPUTE">Recharge Pending / Failed</option>
                        <option value="REFUND_REQUEST">Wallet Refund Request</option>
                        <option value="WALLET_ISSUE">Add Money Reconciliation</option>
                        <option value="KYC_VERIFICATION">KYC Verification Help</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Disputed Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={ticketAmount}
                        onChange={(e) => setTicketAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Describe the transaction issue clearly..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={processingTx}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold"
                    >
                      Submit Support Ticket
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* MONTHLY SPENDING & CATEGORY EXPENSE ANALYTICS DASHBOARD (RECHARTS) */}
            <CustomerSpendingAnalytics
              ledger={ledger}
              cashbackEarned={Number(user.cashbackEarned || 0)}
            />

            {/* LIVE DOUBLE-ENTRY WALLET LEDGER & TRANSACTION HISTORY */}
            <div
              ref={historySectionRef}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Double-Entry Wallet Ledger & Passbook
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Every transaction records opening balance, debit/credit posting, closing balance, and idempotency key.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {ledger.length} Entries
                </span>
              </div>

              {ledger.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No wallet ledger entries yet. Execute a recharge or top-up above to record your first double-entry transaction.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 pr-3">TX ID & Service</th>
                        <th className="py-2.5 px-3">Target / Provider</th>
                        <th className="py-2.5 px-3 text-right">Type & Amount</th>
                        <th className="py-2.5 px-3 text-right">Closing Bal</th>
                        <th className="py-2.5 pl-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                      {ledger.slice(0, 10).map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.service}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {item.txId} · {item.status}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {item.targetAccount}
                            </div>
                            <div className="text-[11px] text-slate-500">{item.provider}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                            <span
                              className={
                                item.entryType === 'CREDIT'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-900 dark:text-white'
                              }
                            >
                              {item.entryType === 'CREDIT' ? '+' : '-'}₹
                              {Number(item.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            ₹{Number(item.balanceAfter).toFixed(2)}
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptModal(item)}
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NATIVE MOBILE & TABLET FIXED BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-lg mx-auto grid grid-cols-5 items-center h-16">
          <button
            type="button"
            onClick={() => {
              setMobileBottomTab('Home');
              setActiveWorkspaceTab('RECHARGE');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-bold transition-colors ${
              mobileBottomTab === 'Home'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileBottomTab('History');
              historySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-bold transition-colors ${
              mobileBottomTab === 'History'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span>History</span>
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setMobileBottomTab('Scan');
                openModule('UPI_SCAN');
              }}
              className="w-14 h-14 -mt-6 rounded-full bg-gradient-to-tr from-[#0039A6] via-[#0052FF] to-[#0284C7] text-white shadow-lg border-4 border-white dark:border-slate-900 flex items-center justify-center active:scale-95 transition-transform"
              title="UPI Scan & Pay"
            >
              <QrCode className="w-6 h-6" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileBottomTab('Offers');
              offersSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-bold transition-colors ${
              mobileBottomTab === 'Offers'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Gift className="w-5 h-5 mb-0.5" />
            <span>Offers</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileBottomTab('Profile');
              openModule('WHATSAPP_OTP');
            }}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-bold transition-colors ${
              mobileBottomTab === 'Profile'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>Profile</span>
          </button>
        </div>
      </nav>

      {/* Transaction Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Verified Transaction Receipt
                  </h4>
                  <p className="text-xs text-slate-500">Recharge Expres Double-Entry Ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3 text-xs">
              <div className="text-center py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                <div className="text-slate-500">
                  Transaction Amount ({receiptModal.entryType})
                </div>
                <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  ₹{Number(receiptModal.amount).toFixed(2)}
                </div>
                <div className="text-emerald-600 font-semibold mt-1">
                  {receiptModal.status}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {receiptModal.txId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway / Operator Ref</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {receiptModal.gatewayRef}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Idempotency Key</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {receiptModal.idempotencyKey}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service & Provider</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {receiptModal.service} ({receiptModal.provider})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Account</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {receiptModal.targetAccount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Opening → Closing Balance</span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                    ₹{Number(receiptModal.balanceBefore).toFixed(2)} → ₹
                    {Number(receiptModal.balanceAfter).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReceiptModal(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Animated Indian Express Train Recharge Success & Sound Modal */}
      <RechargeSuccessTrainModal
        data={trainCelebration}
        onClose={() => setTrainCelebration(null)}
      />
    </div>
  );
};
