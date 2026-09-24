import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { earningsApi } from '@/api/earnings';
import { EmptyState } from '@/components/ui/States';
import { formatDate, formatPrice } from '@/utils/format';

export function EarningsPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['my-earnings'], queryFn: earningsApi.getMine });
  const summary = data?.data;
  const withdrawal = useMutation({
    mutationFn: () => earningsApi.requestWithdrawal(Math.trunc(Number(amount)), { accountName, accountNumber, bankName }),
    onSuccess: () => { setAmount(''); setError(null); void queryClient.invalidateQueries({ queryKey: ['my-earnings'] }); },
    onError: (caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Unable to request withdrawal.'),
  });

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">Loading earnings...</div>;
  if (!summary) return <div className="mx-auto max-w-4xl px-4 py-8"><EmptyState title="Earnings unavailable" description="Complete an approved business or rider account before earnings can be shown." /></div>;

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><h1 className="font-display text-2xl font-bold text-gray-900">Earnings</h1><p className="mt-1 text-sm text-gray-500">Delivery earnings and withdrawal requests.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-primary-700 p-5 text-white"><p className="text-sm opacity-80">Available</p><p className="mt-2 text-2xl font-bold">{formatPrice(summary.availableBalance)}</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Total earned</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(summary.totalEarned)}</p></div><div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Withdrawn or pending</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(summary.totalWithdrawn)}</p></div></div><section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-bold text-gray-900">Request withdrawal</h2>{error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-4 grid gap-3 sm:grid-cols-2"><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount (NGN)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Account name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /><input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><button type="button" disabled={!amount || !bankName || !accountName || !accountNumber || withdrawal.isPending} onClick={() => withdrawal.mutate()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Banknote className="h-4 w-4" /> Request withdrawal</button></section><section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-bold text-gray-900">Delivery earnings</h2>{summary.earnings.length === 0 ? <p className="mt-3 text-sm text-gray-500">Completed delivery earnings will appear here.</p> : <div className="mt-3 space-y-2">{summary.earnings.map((earning) => <div key={earning.id} className="flex items-center justify-between border-b border-gray-100 py-3 text-sm"><div><p className="font-semibold text-gray-900">{earning.description}</p><p className="text-xs text-gray-500">Delivery {earning.deliveryId.slice(-6).toUpperCase()} · {formatDate(earning.createdAt)}</p></div><span className="font-bold text-success-700">{formatPrice(Number(earning.amount))}</span></div>)}</div>}</section><section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-bold text-gray-900">Withdrawals</h2>{summary.withdrawals.length === 0 ? <p className="mt-3 text-sm text-gray-500">No withdrawal requests yet.</p> : <div className="mt-3 space-y-2">{summary.withdrawals.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-gray-100 py-3 text-sm"><div><p className="font-semibold text-gray-900">{item.status}</p><p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p></div><span className="font-bold text-gray-900">{formatPrice(Number(item.amount))}</span></div>)}</div>}</section></div>;
}
