import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  Download,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { LedgerEntry, LedgerStatus } from '../types/zevro';

interface EarningsWalletViewProps {
  ledger: LedgerEntry[];
  availableBalance: number;
  escrowBalance: number;
  onWithdraw: (amount: number, destination: string) => void;
}

const STATUS_TABS: ('All' | LedgerStatus)[] = [
  'All',
  'Settled',
  'In Escrow',
  'Withdrawn',
];

export const EarningsWalletView: React.FC<EarningsWalletViewProps> = ({
  ledger,
  availableBalance,
  escrowBalance,
  onWithdraw,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | LedgerStatus>('All');
  const [query, setQuery] = useState('');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>(
    String(availableBalance)
  );
  const [destination, setDestination] = useState('arjun.pro@okhdfcbank');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawNotice, setWithdrawNotice] = useState('');

  const weeklyGross = useMemo(
    () =>
      ledger
        .filter((e) => e.status !== 'Withdrawn')
        .reduce((sum, e) => sum + e.netAmount, 0),
    [ledger]
  );

  const settledCount = useMemo(
    () => ledger.filter((e) => e.status === 'Settled').length,
    [ledger]
  );

  const filteredLedger = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.filter((entry) => {
      const matchesStatus =
        statusFilter === 'All' || entry.status === statusFilter;
      const matchesQuery =
        !q ||
        entry.description.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q) ||
        entry.zone.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [ledger, statusFilter, query]);

  const handleOpenWithdraw = () => {
    setWithdrawAmount(String(availableBalance));
    setWithdrawError('');
    setWithdrawOpen(true);
  };

  const handleSubmitWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(withdrawAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setWithdrawError('Enter a valid payout amount greater than ₹0.');
      return;
    }
    if (numericAmount > availableBalance) {
      setWithdrawError(
        `Amount exceeds your available balance of ₹${availableBalance.toLocaleString('en-IN')}.`
      );
      return;
    }
    if (!destination.trim() || destination.trim().length < 5) {
      setWithdrawError('Enter a valid UPI ID or bank account reference.');
      return;
    }
    onWithdraw(numericAmount, destination.trim());
    setWithdrawOpen(false);
    setWithdrawNotice(
      `Instant IMPS/UPI transfer of ₹${numericAmount.toLocaleString('en-IN')} queued to ${destination.trim()}.`
    );
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Entry ID',
      'Date',
      'Description',
      'Zone',
      'Duration',
      'Gross (INR)',
      'Fee (INR)',
      'Net (INR)',
      'Status',
    ];
    const rows = filteredLedger.map((r) => [
      r.id,
      r.date,
      `"${r.description.replace(/"/g, '""')}"`,
      r.zone,
      r.durationLabel,
      r.grossAmount,
      r.platformFee,
      r.netAmount,
      r.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'zevro-earnings-ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#e4e4e7] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.06em] text-[#059669] uppercase">
            Worker Treasury · Zero-Delay Shift Settlement
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-[-0.02em] text-[#18181b]">
            Wallet &amp; Earnings Ledger
          </h1>
          <p className="mt-1 text-sm text-[#52525b]">
            Monitor settled day-to-day shift payouts, active escrow holds, and instant UPI/IMPS withdrawals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border-[1.5px] border-[#d4d4d8] bg-white px-4 py-2 text-sm font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            disabled={availableBalance <= 0}
            onClick={handleOpenWithdraw}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#059669] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#d4d4d8] whitespace-nowrap cursor-pointer"
          >
            <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
            <span>Withdraw to UPI / Bank</span>
          </button>
        </div>
      </div>

      {withdrawNotice && (
        <div
          role="status"
          className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-3 text-sm font-medium text-[#047857]"
        >
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            {withdrawNotice}
          </span>
          <button
            type="button"
            onClick={() => setWithdrawNotice('')}
            aria-label="Dismiss notification"
            className="rounded p-1 hover:bg-[#d1fae5] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4-Column Tabular KPI Strip */}
      <section
        aria-label="Earnings Summary"
        className="mt-8 grid grid-cols-1 divide-y divide-[#e4e4e7] rounded-2xl border border-[#e4e4e7] bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
      >
        <div className="p-6">
          <p className="text-xs font-semibold text-[#71717a]">
            Available Instant Payout
          </p>
          <p className="mt-2 font-mono text-3xl font-extrabold text-[#059669] tabular-nums">
            ₹{availableBalance.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-[#52525b]">Ready for 0-fee UPI transfer</p>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold text-[#71717a]">Held in Escrow</p>
          <p className="mt-2 font-mono text-3xl font-extrabold text-[#18181b] tabular-nums">
            ₹{escrowBalance.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-[#52525b]">Releases on shift OTP sign-off</p>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold text-[#71717a]">7-Day Net Earnings</p>
          <p className="mt-2 font-mono text-3xl font-extrabold text-[#18181b] tabular-nums">
            ₹{weeklyGross.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#059669]">+14% vs prior week</p>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold text-[#71717a]">Settled Shifts</p>
          <p className="mt-2 font-mono text-3xl font-extrabold text-[#18181b] tabular-nums">
            {settledCount}
          </p>
          <p className="mt-1 text-xs text-[#52525b]">100% on-time settlement</p>
        </div>
      </section>

      {/* Ledger Controls & High-Density Table */}
      <section className="mt-10 rounded-2xl border border-[#e4e4e7] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#e4e4e7] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#f4f4f5] p-1 w-fit">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#047857] shadow-xs'
                      : 'text-[#52525b] hover:text-[#18181b]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, shift, or zone..."
              className="h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white pl-9 pr-3 text-sm text-[#18181b] placeholder:text-[#71717a] focus:border-[#059669] focus:outline-none"
            />
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-[#18181b]">
              No ledger entries match your filter
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setQuery('');
              }}
              className="mt-3 text-xs font-semibold text-[#059669] hover:underline cursor-pointer"
            >
              Clear ledger filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e4e4e7] bg-[#fcfbfa] text-xs font-semibold text-[#71717a]">
                  <th className="px-5 py-3.5">Ref ID</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Job / Transfer Description</th>
                  <th className="px-5 py-3.5">Zone</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5 text-right">Gross</th>
                  <th className="px-5 py-3.5 text-right">Fee</th>
                  <th className="px-5 py-3.5 text-right">Net Payout</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e4e7]">
                {filteredLedger.map((entry) => (
                  <tr
                    key={entry.id}
                    className="transition-colors hover:bg-[#f4f4f5]/50"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#18181b] whitespace-nowrap">
                      {entry.id}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#52525b] whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#18181b]">
                      {entry.description}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#52525b] whitespace-nowrap">
                      {entry.zone}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#52525b] whitespace-nowrap tabular-nums">
                      {entry.durationLabel}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-[#52525b] tabular-nums whitespace-nowrap">
                      ₹{entry.grossAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-[#71717a] tabular-nums whitespace-nowrap">
                      ₹{entry.platformFee.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-[#18181b] tabular-nums whitespace-nowrap">
                      {entry.status === 'Withdrawn' ? '−' : '+'}₹
                      {entry.netAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          entry.status === 'Settled'
                            ? 'text-[#059669]'
                            : entry.status === 'In Escrow'
                            ? 'text-[#d97706]'
                            : 'text-[#52525b]'
                        }
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Instant Withdraw Modal */}
      {withdrawOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181b]/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#059669]" aria-hidden="true" />
                <h2
                  id="withdraw-modal-title"
                  className="font-display text-lg font-bold text-[#18181b]"
                >
                  Instant UPI / Bank Payout
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawOpen(false)}
                aria-label="Close payout dialog"
                className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#18181b] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWithdraw} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="withdraw-amount"
                  className="block text-xs font-semibold text-[#52525b]"
                >
                  Payout Amount (INR) — Available: ₹
                  {availableBalance.toLocaleString('en-IN')}
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  min={1}
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] px-3.5 font-mono text-base font-bold text-[#18181b] tabular-nums focus:border-[#059669] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="withdraw-dest"
                  className="block text-xs font-semibold text-[#52525b]"
                >
                  Destination UPI ID or Verified Bank Account
                </label>
                <input
                  id="withdraw-dest"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-[#e4e4e7] px-3.5 text-sm font-medium text-[#18181b] focus:border-[#059669] focus:outline-none"
                />
              </div>

              {withdrawError && (
                <p className="text-xs font-semibold text-[#be123c]">
                  {withdrawError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawOpen(false)}
                  className="min-h-[40px] rounded-lg border border-[#e4e4e7] bg-white px-4 py-2 text-sm font-semibold text-[#18181b] hover:bg-[#f4f4f5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-lg bg-[#059669] px-5 py-2 text-sm font-semibold text-white hover:bg-[#047857] cursor-pointer"
                >
                  Transfer Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
