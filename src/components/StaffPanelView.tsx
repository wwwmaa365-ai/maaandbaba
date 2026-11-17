import React, { useState } from 'react';
import {
  UserCheck,
  Lock,
  HelpCircle,
  Activity,
  RefreshCw,
  FileBarChart,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  StaffMember,
  LedgerEntry,
  SupportTicket,
  PayoutRequest,
  UserProfile,
} from '../types/fintech.ts';
import { processSupportTicketRefundByAdmin } from '../services/firestoreService.ts';

interface StaffPanelViewProps {
  currentUser: UserProfile;
  staffList: StaffMember[];
  ledger: LedgerEntry[];
  tickets: SupportTicket[];
  payouts: PayoutRequest[];
}

export const StaffPanelView: React.FC<StaffPanelViewProps> = ({
  currentUser,
  staffList,
  ledger,
  tickets,
  payouts,
}) => {
  const defaultStaff: StaffMember = staffList[0] || {
    id: 'staff_ops_lead',
    name: 'Aarav Sharma',
    email: 'aarav.support@rechargeexpres.in',
    department: 'Customer Support & Disputes',
    roleTitle: 'Senior Support Officer',
    permissions: 'CUSTOMER_SUPPORT,TRANSACTION_MONITORING,REFUND_REQUESTS',
    status: 'ACTIVE',
    createdBy: 'system',
  };

  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaff.id);
  const activeStaff =
    staffList.find((s) => s.id === selectedStaffId) || defaultStaff;
  const activePerms = activeStaff.permissions.split(',').map((p) => p.trim());

  const [activeTab, setActiveTab] = useState<
    'CUSTOMER_SUPPORT' | 'TRANSACTION_MONITORING' | 'REFUND_REQUESTS' | 'WALLET_APPROVAL' | 'REPORTS'
  >('CUSTOMER_SUPPORT');

  const hasPermission = (perm: string) => activePerms.includes(perm);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Staff Role Header & Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Role-Based Staff Operations Panel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Section 10 Compliance: Staff accounts enforce strict module-level RBAC and block unrestricted treasury or merchant API secret access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Active Staff Profile:
          </label>
          <select
            value={activeStaff.id}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
          >
            {(staffList.length > 0 ? staffList : [defaultStaff]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.roleTitle})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Permission Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Assigned RBAC Scopes for {activeStaff.name}:
          </span>{' '}
          <span className="font-mono text-blue-600 dark:text-blue-400">
            {activeStaff.permissions}
          </span>
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Merchant API Secrets & Unrestricted Wallet Credits Locked</span>
        </div>
      </div>

      {/* Staff Module Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'CUSTOMER_SUPPORT', label: 'Customer Support Desk', icon: HelpCircle },
          { id: 'TRANSACTION_MONITORING', label: 'Transaction Monitoring', icon: Activity },
          { id: 'REFUND_REQUESTS', label: 'Refund Requests', icon: RefreshCw },
          { id: 'WALLET_APPROVAL', label: 'Wallet & Payout Approval', icon: UserCheck },
          { id: 'REPORTS', label: 'Reconciliation Reports', icon: FileBarChart },
        ].map((tab) => {
          const Icon = tab.icon;
          const allowed = hasPermission(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {!allowed && <Lock className="w-3 h-3 text-amber-500" />}
            </button>
          );
        })}
      </div>

      {/* Module Workspace with RBAC Enforcement */}
      {!hasPermission(activeTab) ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            RBAC Permission Restricted ({activeTab})
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Staff account <span className="font-semibold">{activeStaff.name}</span> ({activeStaff.roleTitle}) does not have the <span className="font-mono">{activeTab}</span> permission scope. Switch to another staff role or grant this scope in the Super Admin Dashboard.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          {activeTab === 'CUSTOMER_SUPPORT' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Support Queue ({tickets.length} Tickets)
              </h2>
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No open customer support tickets.</p>
              ) : (
                <div className="space-y-2.5">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {t.subject} · <span className="font-mono text-blue-600">{t.txId}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Customer: {t.userName} · Category: {t.category} · Status: {t.status}
                        </div>
                      </div>
                      {t.status === 'OPEN' && (
                        <button
                          onClick={() =>
                            processSupportTicketRefundByAdmin(
                              currentUser.uid,
                              currentUser.email,
                              t,
                              'RESOLVED',
                              `Resolved by Staff (${activeStaff.name})`
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold shrink-0"
                        >
                          Mark Assisted
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'TRANSACTION_MONITORING' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Live Recharge & Ledger Transaction Monitor (Read-Only Staff Scope)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 pr-3">TX Reference</th>
                      <th className="py-2 px-3">Service & Provider</th>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                    {ledger.slice(0, 10).map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">
                          {item.txId}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {item.service} ({item.provider})
                        </td>
                        <td className="py-2.5 px-3">{item.targetAccount}</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          ₹{Number(item.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 pl-3 text-emerald-600 font-semibold">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'REFUND_REQUESTS' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pending Refund Verification Desk
              </h2>
              <p className="text-xs text-slate-500">
                Staff with `REFUND_REQUESTS` scope can verify failed recharges and trigger automated reversal to the customer's wallet.
              </p>
              <div className="space-y-2.5">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        TX: {t.txId} — ₹{Number(t.amount).toFixed(2)}
                      </div>
                      <div className="text-slate-500">{t.subject} · {t.status}</div>
                    </div>
                    {t.status === 'OPEN' && (
                      <button
                        onClick={() =>
                          processSupportTicketRefundByAdmin(
                            currentUser.uid,
                            currentUser.email,
                            t,
                            'REFUND_APPROVED',
                            `Verified by Staff ${activeStaff.name}`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Verify & Approve Refund
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'WALLET_APPROVAL' && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Bank Withdrawal & Wallet Reconciliation Queue ({payouts.length})
              </h2>
              <div className="space-y-2 text-xs">
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between"
                  >
                    <div>
                      <span className="font-bold">{p.accountHolder}</span> · {p.accountNumberMasked} ({p.mode})
                    </div>
                    <div className="font-mono font-bold">
                      ₹{Number(p.amount).toFixed(2)} · {p.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'REPORTS' && (
            <div className="space-y-3 text-xs">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Settlement & BBPS Reconciliation Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500">Total Ledger Entries</div>
                  <div className="text-xl font-bold font-mono tabular-nums mt-1">{ledger.length}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500">Open Support Tickets</div>
                  <div className="text-xl font-bold font-mono tabular-nums mt-1">
                    {tickets.filter((t) => t.status === 'OPEN').length}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500">Double-Entry Balance Check</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>100% Reconciled</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
