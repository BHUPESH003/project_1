import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Table, type Column } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { usePayouts, useProcessPayout, useRejectPayout } from '@/api/hooks/usePayouts'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { money, timeAgo } from '@/lib/format'
import { PAGE_SIZE, PAYOUT_STATUS_TONE } from '@/lib/constants'
import type { AdminPayout, BankDetails, PayoutStatus } from '@/types/api'

const TABS: { key: PayoutStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'REJECTED', label: 'Rejected' },
]

function maskBank(bank: BankDetails | null): string {
  if (!bank) return '—'
  const code = bank.ifscCode?.slice(0, 4) || 'BANK'
  const last4 = bank.accountNumber?.slice(-4) ?? '????'
  return `${code} •••• ${last4}`
}

export function PayoutsPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? 'PENDING') as PayoutStatus
  const page = Number(params.get('page') ?? '1')

  const { data, isLoading, isError, refetch } = usePayouts({ status, page, limit: PAGE_SIZE })
  const process = useProcessPayout()
  const reject = useRejectPayout()

  const [processTarget, setProcessTarget] = useState<AdminPayout | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminPayout | null>(null)
  const [detailTarget, setDetailTarget] = useState<AdminPayout | null>(null)
  const [note, setNote] = useState('')

  function setStatus(next: PayoutStatus) {
    setParams({ status: next, page: '1' }, { replace: true })
  }

  const columns: Column<AdminPayout>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (p) => <span className="text-text-2">{timeAgo(p.createdAt)}</span>,
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (p) => <span className="font-medium text-text">{p.seller.shopName}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (p) => <span className="font-semibold">{money(p.amount)}</span>,
    },
    {
      key: 'bank',
      header: 'Bank',
      render: (p) => <span className="mono-num text-text-2">{maskBank(p.bankDetails)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge tone={PAYOUT_STATUS_TONE[p.status]}>{p.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '200px',
      render: (p) =>
        p.status === 'PENDING' || p.status === 'PROCESSING' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => { setNote(''); setProcessTarget(p) }}>
              Process
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejectTarget(p)}>
              Reject
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setDetailTarget(p)}>
              Details
            </Button>
          </div>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title-lg font-bold text-text">Payouts</h1>
        <p className="text-subhead text-text-2">
          Withdrawal requests raised by sellers — review and settle manually
        </p>
      </div>

      <div className="flex gap-1 self-start rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={
              'rounded-md px-3.5 py-1.5 text-subhead font-medium transition-colors ' +
              (status === t.key ? 'bg-primary text-on-primary' : 'text-text-2 hover:bg-surface-2')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <Table<AdminPayout>
        columns={columns}
        data={data?.data}
        rowKey={(p) => p.id}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        emptyTitle={`No ${status.toLowerCase()} payouts`}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          total: data?.pagination.total,
          onPageChange: (p) => setParams({ status, page: p.toString() }, { replace: true }),
        }}
      />

      {/* Process — shows full bank details + optional note */}
      <Modal
        open={!!processTarget}
        onOpenChange={(o) => !o && setProcessTarget(null)}
        title="Process payout"
        footer={
          <>
            <Button variant="secondary" onClick={() => setProcessTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={process.isPending}
              onClick={async () => {
                if (!processTarget) return
                try {
                  await process.mutateAsync({ id: processTarget.id, note: note || undefined })
                  toast.success('Payout processed')
                  setProcessTarget(null)
                } catch (e) {
                  toast.error(getErrorMessage(e))
                }
              }}
            >
              Mark as processed
            </Button>
          </>
        }
      >
        {processTarget && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <span className="text-subhead text-text-2">Amount</span>
                <span className="text-title font-bold text-text">{money(processTarget.amount)}</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-subhead">
                <Detail label="Account holder" value={processTarget.bankDetails?.accountHolder} />
                <Detail label="Account number" value={processTarget.bankDetails?.accountNumber} mono />
                <Detail label="IFSC" value={processTarget.bankDetails?.ifscCode} mono />
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-subhead font-medium text-text-2">Note (optional)</span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Transaction reference…"
                className="resize-none rounded-md border-[1.5px] border-border bg-surface px-3 py-2 text-body text-text outline-none placeholder:text-text-3 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]"
              />
            </label>
          </div>
        )}
      </Modal>

      {/* Reject — required reason */}
      <ConfirmModal
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="Reject payout"
        danger
        confirmLabel="Reject"
        requireReason
        reasonLabel="Reason"
        message={
          rejectTarget ? (
            <>
              Reject the {money(rejectTarget.amount)} payout for{' '}
              <b className="text-text">{rejectTarget.seller.shopName}</b>? The amount returns to
              their available balance.
            </>
          ) : null
        }
        onConfirm={async (reason) => {
          if (!rejectTarget) return
          await reject.mutateAsync({ id: rejectTarget.id, reason })
          toast.success('Payout rejected')
          setRejectTarget(null)
        }}
      />

      {/* Details (completed / rejected) */}
      <Modal
        open={!!detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
        title="Payout details"
        size="sm"
      >
        {detailTarget && (
          <div className="flex flex-col gap-1.5 text-subhead">
            <Detail label="Seller" value={detailTarget.seller.shopName} />
            <Detail label="Amount" value={money(detailTarget.amount)} />
            <Detail label="Status" value={detailTarget.status} />
            <Detail
              label="Processed"
              value={detailTarget.processedAt ? timeAgo(detailTarget.processedAt) : '—'}
            />
            <Detail label="Processed by" value={detailTarget.processedBy ?? '—'} mono />
            <Detail label="Note" value={detailTarget.note ?? '—'} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-3">{label}</span>
      <span className={'text-right text-text' + (mono ? ' mono-num text-caption' : '')}>
        {value ?? '—'}
      </span>
    </div>
  )
}
