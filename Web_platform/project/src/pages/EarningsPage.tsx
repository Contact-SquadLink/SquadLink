import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Wallet,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Building,
  CreditCard,
  User,
  History,
} from 'lucide-react';
import { earningsApi } from '@/api/earnings';
import { EmptyState } from '@/components/ui/States';
import { formatDate, formatPrice } from '@/utils/format';

const POPULAR_BANKS = [
  'Access Bank',
  'First Bank of Nigeria',
  'Guaranty Trust Bank (GTBank)',
  'United Bank for Africa (UBA)',
  'Zenith Bank',
  'Fidelity Bank',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'Union Bank',
  'Wema Bank / ALAT',
  'Kuda Bank',
  'Opay',
  'Palmpay',
  'Jaiz Bank',
  'Taj Bank',
];

export function EarningsPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'WITHDRAWALS' | 'EARNINGS'>('WITHDRAWALS');

  const { data, isLoading } = useQuery({
    queryKey: ['my-earnings'],
    queryFn: earningsApi.getMine,
  });

  const summary = data?.data;
  const minWithdrawal = summary?.minimumWithdrawalAmount ?? 1000;
  const approvalThreshold = summary?.adminApprovalThreshold ?? 10000;

  const withdrawal = useMutation({
    mutationFn: () =>
      earningsApi.requestWithdrawal(Math.trunc(Number(amount)), {
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
      }),
    onSuccess: (res) => {
      const isAuto = res.data?.status === 'APPROVED';
      setSuccessMessage(
        isAuto
          ? `Withdrawal of ₦${Number(amount).toLocaleString()} was automatically verified and approved!`
          : `Withdrawal request of ₦${Number(amount).toLocaleString()} submitted for administrator verification.`
      );
      setAmount('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['my-earnings'] });
    },
    onError: (caughtError) => {
      setSuccessMessage(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to process withdrawal request.'
      );
    },
  });

  const numAmount = Number(amount) || 0;
  const isBelowMin = numAmount > 0 && numAmount < minWithdrawal;
  const isExceedingBalance = summary ? numAmount > summary.availableBalance : false;
  const isAccNumValid = /^\d{10}$/.test(accountNumber.trim());
  const isFormValid =
    numAmount >= minWithdrawal &&
    !isExceedingBalance &&
    bankName.trim().length >= 2 &&
    accountName.trim().length >= 2 &&
    isAccNumValid;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-gray-500">
        Loading earnings and settlement ledger...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          title="Earnings Unavailable"
          description="Complete an approved merchant business or courier rider registration before earnings can be displayed."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          SquadLink Financial Settlements
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
          Earnings & Disbursements
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review your fulfillment earnings, request secure bank account withdrawals, and track audit history.
        </p>
      </div>

      {/* Policy & Compliance Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/50 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xs sm:text-sm text-blue-950">
            <p className="font-semibold">Standard Withdrawal & Audit Policy</p>
            <p className="mt-0.5 text-blue-800 leading-relaxed">
              • <strong>Minimum withdrawal:</strong> {formatPrice(minWithdrawal)} per transaction. <br />
              • <strong>Auto-Verification:</strong> Amounts up to {formatPrice(approvalThreshold)} are automatically verified against your completed order earnings. <br />
              • <strong>Administrative Review:</strong> High-value amounts over {formatPrice(approvalThreshold)} undergo compliance review before bank disbursement.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between opacity-80 text-xs font-semibold uppercase tracking-wider">
              <span>Available for Withdrawal</span>
              <Wallet className="h-4 w-4" />
            </div>
            <p className="mt-3 text-3xl font-extrabold">{formatPrice(summary.availableBalance)}</p>
          </div>
          {summary.availableBalance >= minWithdrawal && (
            <button
              type="button"
              onClick={() => {
                setAmount(String(summary.availableBalance));
                setError(null);
              }}
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary-200 hover:text-white transition-colors"
            >
              Withdraw Full Balance <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Total Earned to Date</span>
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">
              {formatPrice(summary.totalEarned)}
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            {summary.earnings.length} verified order transaction{summary.earnings.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Withdrawn & Pending</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">
              {formatPrice(summary.totalWithdrawn)}
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            {summary.withdrawals.length} withdrawal request{summary.withdrawals.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Withdrawal Request Section */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900">
              Request Bank Withdrawal
            </h2>
            <p className="text-xs text-gray-500">
              Disburse funds directly to your verified Nigerian commercial bank account.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Escrow Protected
          </span>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-100">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* Amount Input & Preset Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Withdrawal Amount (₦)
              </label>
              <span className="text-xs text-gray-400">
                Min: {formatPrice(minWithdrawal)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                ₦
              </span>
              <input
                type="number"
                min={minWithdrawal}
                step="100"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                placeholder="1,000"
                className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-2.5 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Quick Chips */}
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              {[1000, 2000, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(String(preset));
                    setError(null);
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
              {summary.availableBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(String(summary.availableBalance));
                    setError(null);
                  }}
                  className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  All (₦{summary.availableBalance.toLocaleString()})
                </button>
              )}
            </div>

            {isBelowMin && (
              <p className="mt-1.5 text-xs text-amber-600 font-medium">
                The minimum withdrawal amount is {formatPrice(minWithdrawal)}.
              </p>
            )}

            {isExceedingBalance && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                Amount exceeds your available balance of {formatPrice(summary.availableBalance)}.
              </p>
            )}

            {numAmount > approvalThreshold && !isExceedingBalance && (
              <p className="mt-1.5 text-xs text-blue-700 font-medium">
                ℹ️ Amounts exceeding {formatPrice(approvalThreshold)} will undergo administrator compliance review before transfer.
              </p>
            )}
          </div>

          {/* Bank Details Grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Bank Name
              </label>
              <div className="relative">
                <input
                  list="nigerian-banks"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Select or enter bank"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <datalist id="nigerian-banks">
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Account Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Account Number
                </label>
                <span className={`text-[10px] ${isAccNumValid ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                  {accountNumber.trim().length}/10 digits
                </span>
              </div>
              <input
                type="text"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit NUBAN"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name on bank account"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Funds will be transferred to your Nigerian commercial bank account.
          </p>
          <button
            type="button"
            disabled={!isFormValid || withdrawal.isPending}
            onClick={() => withdrawal.mutate()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Banknote className="h-4 w-4" />
            {withdrawal.isPending ? 'Processing...' : 'Request Withdrawal'}
          </button>
        </div>
      </section>

      {/* Transaction & Audit Ledger Section */}
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'WITHDRAWALS'
                ? 'border-primary-600 text-primary-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <History className="h-4 w-4" />
            Withdrawal Audit Trail
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-semibold">
              {summary.withdrawals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EARNINGS')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'EARNINGS'
                ? 'border-primary-600 text-primary-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Banknote className="h-4 w-4" />
            Earnings Credited
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-semibold">
              {summary.earnings.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Withdrawal Requests Audit */}
        {activeTab === 'WITHDRAWALS' && (
          <div className="p-5">
            {summary.withdrawals.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No withdrawal transactions on record yet.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.withdrawals.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 bg-gray-50/40 hover:border-gray-200 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Ref: #{item.id.slice(0, 8)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            item.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'PAID'
                            ? 'Paid / Transferred'
                            : item.status === 'APPROVED'
                            ? 'Approved (Scheduled)'
                            : item.status === 'REJECTED'
                            ? 'Declined'
                            : 'Pending Admin Verification'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600">
                        <span>
                          {item.payoutDetails?.bankName || 'Bank'} · Acct: {item.payoutDetails?.accountNumber || 'N/A'} · {item.payoutDetails?.accountName || ''}
                        </span>
                        <span className="text-gray-400 block mt-0.5">
                          Requested: {formatDate(item.createdAt)}
                        </span>
                      </div>

                      {item.reviewReason && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          Audit Note: {item.reviewReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right sm:self-center">
                      <p className="text-base font-extrabold text-gray-900">
                        {formatPrice(Number(item.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Earnings Credited Ledger */}
        {activeTab === 'EARNINGS' && (
          <div className="p-5">
            {summary.earnings.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Completed delivery and merchandise earnings will appear here upon customer confirmation.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.earnings.map((earning) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between border-b border-gray-100 py-3 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{earning.description}</p>
                      <p className="text-xs text-gray-500">
                        Delivery {earning.deliveryId.slice(-6).toUpperCase()} · Order #{earning.orderId.slice(0, 8)} · {formatDate(earning.createdAt)}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600">
                      +{formatPrice(Number(earning.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
