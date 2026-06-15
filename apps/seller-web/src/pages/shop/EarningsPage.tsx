import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { StackHeader } from '@/components/layout/StackHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { useEarnings, usePayouts, useCreatePayout } from '@/api/hooks/useEarnings'
import { money } from '@/lib/format'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/cn'
import type { EarningsPeriod, PayoutStatus } from '@/types/api'

const PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All time' },
]

const PAYOUT_TONE: Record<PayoutStatus, string> = {
  PENDING: 'bg-warning-soft text-warning',
  PROCESSING: 'bg-info-soft text-info',
  COMPLETED: 'bg-success-soft text-success',
  REJECTED: 'bg-danger-soft text-danger',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export function EarningsPage() {
  const [period, setPeriod] = useState<EarningsPeriod>('month')
  const { data: earnings, isLoading, error, refetch } = useEarnings(period)
  const { data: payouts } = usePayouts()
  const createPayout = useCreatePayout()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [holder, setHolder] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')

  const available = earnings?.availableBalance ?? 0
  const canWithdraw = available >= 100

  const amountValid =
    amount !== '' && Number(amount) >= 1 && Number(amount) <= available
  const bankValid = holder.trim() && accountNumber.trim() && ifsc.trim()

  async function submitWithdrawal() {
    try {
      await createPayout.mutateAsync({
        amount: Number(amount),
        bankDetails: {
          accountHolder: holder.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifsc.trim().toUpperCase(),
        },
      })
      toast.success('Withdrawal requested')
      setSheetOpen(false)
      setAmount('')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div>
      <StackHeader title="Earnings" />

      <div className="px-4 pb-10">
        {/* Period selector */}
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-subhead font-semibold transition-colors',
                period === p.key
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface text-text-2',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : earnings ? (
          <>
            {/* Total */}
            <div className="mt-4 rounded-2xl border border-border bg-surface p-5 text-center">
              <p className="text-caption uppercase tracking-wide text-text-3">
                Earnings ({PERIODS.find((p) => p.key === period)?.label})
              </p>
              <p className="mt-1 text-display-lg font-extrabold text-text tnum">
                {money(earnings.total)}
              </p>
              <p className="mt-1 text-subhead text-text-2">
                {earnings.orderCount} orders • Avg {money(earnings.averageOrderValue)}
              </p>
            </div>

            {/* Balance + withdraw */}
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
              <div>
                <p className="text-caption text-text-3">Available balance</p>
                <p className="text-title-lg font-extrabold text-primary tnum">{money(available)}</p>
              </div>
              <Button
                size="md"
                icon={<Wallet size={16} />}
                disabled={!canWithdraw}
                onClick={() => setSheetOpen(true)}
              >
                Withdraw
              </Button>
            </div>
            {!canWithdraw && (
              <p className="mt-1.5 text-caption text-text-3">
                Minimum withdrawal is ₹100.
              </p>
            )}

            {/* Order breakdown */}
            <h2 className="mb-2 mt-6 text-subhead font-bold uppercase tracking-wide text-text-2">
              Orders
            </h2>
            {earnings.orders.length === 0 ? (
              <EmptyState icon={<Wallet size={30} />} title="No earnings yet" description="Completed orders will show here." />
            ) : (
              <div className="flex flex-col gap-2">
                {earnings.orders.map((o) => (
                  <div
                    key={o.orderId}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-subhead font-medium text-text">{o.itemsSummary}</p>
                      <p className="text-caption text-text-3">
                        {formatDate(o.date)} • #{o.orderId.slice(-6).toUpperCase()}
                      </p>
                    </div>
                    <p className="text-subhead font-bold text-text tnum">{money(o.amount)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Withdrawal history */}
            {payouts && payouts.length > 0 && (
              <>
                <h2 className="mb-2 mt-7 text-subhead font-bold uppercase tracking-wide text-text-2">
                  Withdrawals
                </h2>
                <div className="flex flex-col gap-2">
                  {payouts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3"
                    >
                      <div>
                        <p className="text-subhead font-bold text-text tnum">{money(p.amount)}</p>
                        <p className="text-caption text-text-3">{formatDate(p.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-micro font-bold',
                          PAYOUT_TONE[p.status],
                        )}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>

      {/* Withdrawal request sheet */}
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Request withdrawal">
        <div className="flex flex-col gap-4 pb-2">
          <div className="rounded-xl bg-surface-2 px-4 py-3 text-subhead text-text-2">
            Available: <span className="font-bold text-text tnum">{money(available)}</span>
          </div>
          <Field
            label="Amount (₹)"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={amount !== '' && !amountValid ? `Enter an amount up to ${money(available)}` : undefined}
          />
          <Field label="Account holder name" value={holder} onChange={(e) => setHolder(e.target.value)} />
          <Field
            label="Account number"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <Field label="IFSC code" value={ifsc} onChange={(e) => setIfsc(e.target.value)} />
          <Button
            full
            size="lg"
            disabled={!amountValid || !bankValid}
            loading={createPayout.isPending}
            onClick={submitWithdrawal}
          >
            Request {amount ? money(Number(amount)) : 'withdrawal'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
