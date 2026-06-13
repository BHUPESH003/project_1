import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, ChevronDown, Lock, Info, Truck, Store } from 'lucide-react'
import { useMultiCheckout, usePlaceMultiOrder, createPaymentIntent, verifyPayment } from '@/api/hooks/useCheckout'
import { useCreateAddress } from '@/api/hooks/useUser'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AddressSheet } from '@/components/sheets/AddressSheet'
import { PaymentProcessing } from '@/pages/payment/PaymentProcessing'
import { useAddressStore } from '@/stores/addressStore'
import { getErrorMessage } from '@/api/client'
import { openRazorpay } from '@/lib/razorpay'
import { money, minutes, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { DeliveryOption } from '@/api/types'

export function CheckoutPage() {
  const navigate = useNavigate()
  const address = useAddressStore((s) => s.selectedAddress)
  const setAddress = useAddressStore((s) => s.setAddress)
  const createAddress = useCreateAddress()
  const ensuring = useRef(false)

  const [addressOpen, setAddressOpen] = useState(false)
  const [selections, setSelections] = useState<Record<string, string>>({}) // sellerId → quotationId
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState(false)
  const [processingTotal, setProcessingTotal] = useState(0)

  // Checkout needs a *saved* address id. Persist an ad-hoc pin once.
  useEffect(() => {
    if (address && !address.id && !ensuring.current) {
      ensuring.current = true
      createAddress
        .mutateAsync({
          label: address.label,
          addressLine: address.addressLine,
          latitude: address.latitude,
          longitude: address.longitude,
        })
        .then((saved) => setAddress({ ...address, id: saved.id }))
        .catch(() => undefined)
        .finally(() => {
          ensuring.current = false
        })
    }
  }, [address, createAddress, setAddress])

  const checkout = useMultiCheckout(address?.id)
  const placeOrder = usePlaceMultiOrder()

  const sellers = checkout.data?.sellers ?? []
  const allSelected = sellers.length > 0 && sellers.every((s) => selections[s.seller.id])

  const productTotal = useMemo(
    () => sellers.reduce((sum, s) => sum + toNum(s.bill.total), 0),
    [sellers],
  )
  const deliveryTotal = useMemo(
    () =>
      sellers.reduce((sum, s) => {
        const sel = s.deliveryOptions.find((o) => o.quotationId === selections[s.seller.id])
        return sum + (sel ? toNum(sel.feeRupees) : 0)
      }, 0),
    [sellers, selections],
  )

  function badgeFor(sellerIdx: number, opt: DeliveryOption): { tone: 'primary' | 'success' | 'warning'; label: string } | null {
    const rec = sellers[sellerIdx].recommendations
    if (!rec) return null
    if (rec.recommended === opt.quotationId) return { tone: 'primary', label: 'Recommended' }
    if (rec.cheapest === opt.quotationId) return { tone: 'success', label: 'Cheapest' }
    if (rec.fastest === opt.quotationId) return { tone: 'warning', label: 'Fastest' }
    return null
  }

  async function pay() {
    if (!allSelected || !address?.id) return
    setProcessingTotal(productTotal)
    setProcessing(true)
    try {
      const orderIds = await placeOrder.mutateAsync({
        deliveryAddressId: address.id,
        sellers: sellers.map((s) => {
          const sel = s.deliveryOptions.find((o) => o.quotationId === selections[s.seller.id])!
          return {
            sellerId: s.seller.id,
            quotationId: sel.quotationId,
            deliveryFeeRupees: toNum(sel.feeRupees),
            estimatedMinutes: sel.estimatedMinutes,
            vehicleType: sel.vehicleType,
          }
        }),
      })

      if (!orderIds.length) throw new Error('No orders were created')

      // Pay each order sequentially via Razorpay (delivery paid separately).
      for (const orderId of orderIds) {
        const intent = await createPaymentIntent(orderId)
        const rzp = await openRazorpay(intent)
        await verifyPayment(orderId, rzp)
      }

      navigate('/payment/success', { state: { orderIds, amount: productTotal }, replace: true })
    } catch (e) {
      setProcessing(false)
      navigate('/payment/failure', { state: { reason: getErrorMessage(e, 'Payment was not completed') }, replace: true })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-44 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-title-lg font-bold text-text">Checkout</h1>
      </div>

      {/* Address bar */}
      <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-2 px-4 py-3">
        <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-text-3">DELIVER TO</p>
          <p className="truncate text-subhead font-medium text-text">{address?.label ?? 'Select address'}</p>
          {address?.addressLine && <p className="truncate text-caption text-text-2">{address.addressLine}</p>}
        </div>
        <button onClick={() => setAddressOpen(true)} className="text-subhead font-semibold text-primary">
          Change
        </button>
      </div>

      {/* States */}
      <div className="mt-4 flex-1 space-y-3">
        {!address?.id || checkout.isLoading || createAddress.isPending ? (
          <>
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </>
        ) : checkout.isError ? (
          <ErrorState message="Couldn't load checkout details." onRetry={() => checkout.refetch()} />
        ) : sellers.length === 0 ? (
          <EmptyState icon={<Store size={32} />} title="Nothing to check out" description="Your cart is empty." action={<Button onClick={() => navigate('/')}>Browse shops</Button>} />
        ) : (
          sellers.map((s, idx) => {
            const isOpen = expanded[s.seller.id]
            const itemCount = s.items.reduce((n, it) => n + (it.quantity || 1), 0)
            return (
              <section key={s.seller.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [s.seller.id]: !e[s.seller.id] }))}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
                >
                  <Store size={18} className="text-text-2" />
                  <span className="flex-1">
                    <span className="block text-body font-semibold text-text">{s.seller.shopName}</span>
                    <span className="block text-caption text-text-2">{itemCount} item{itemCount === 1 ? '' : 's'} · {money(s.bill.total)}</span>
                  </span>
                  <ChevronDown size={18} className={cn('text-text-3 transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="border-t border-border-faint px-4 py-2">
                    {s.items.map((it) => (
                      <div key={it.id} className="flex justify-between py-1 text-caption text-text-2">
                        <span className="truncate">
                          {(it.payload as { productName?: string }).productName ?? it.product?.name ?? 'Item'} × {it.quantity}
                        </span>
                        <span className="mono-num">{money(it.lineTotal ?? toNum(it.priceAtAdd) * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border-faint px-4 py-3">
                  <p className="mb-2 flex items-center gap-1.5 text-subhead font-semibold text-text">
                    <Truck size={15} /> Select delivery
                  </p>
                  {s.deliveryOptions.length === 0 ? (
                    <p className="rounded-md bg-warning-soft px-3 py-2 text-caption text-warning">
                      No delivery partners available right now. Please try later.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {s.deliveryOptions.map((opt) => {
                        const selected = selections[s.seller.id] === opt.quotationId
                        const badge = badgeFor(idx, opt)
                        return (
                          <button
                            key={opt.quotationId}
                            onClick={() => setSelections((sel) => ({ ...sel, [s.seller.id]: opt.quotationId }))}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md border-[1.5px] px-3 py-2.5 text-left transition-colors',
                              selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                            )}
                          >
                            <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-border-strong')}>
                              {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                            </span>
                            <span className="flex-1">
                              <span className="flex items-center gap-2">
                                <span className="text-subhead font-semibold text-text">{opt.displayName || opt.providerName}</span>
                                {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                              </span>
                              <span className="text-caption text-text-2">{minutes(opt.estimatedMinutes)} ETA</span>
                            </span>
                            <span className="text-subhead font-bold text-text mono-num">{money(opt.feeRupees)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* Summary */}
      {sellers.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex justify-between py-1 text-subhead text-text-2">
            <span>Items total</span>
            <span className="mono-num">{money(productTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-subhead text-text-2">
            <span className="flex items-center gap-1">Delivery (paid to partner) <Info size={13} /></span>
            <span className="mono-num">{money(deliveryTotal)}</span>
          </div>
          <div className="my-2 border-t border-border" />
          <div className="flex items-center justify-between">
            <span className="text-body font-semibold text-text">You pay now</span>
            <span className="text-title-lg font-bold text-primary mono-num">{money(productTotal)}</span>
          </div>
          <p className="mt-1 text-caption text-text-3">
            Delivery fee is paid directly to the delivery partner, separate from this payment.
          </p>
        </div>
      )}

      {sellers.length > 0 && (
        <div className="fixed inset-x-0 bottom-[var(--bottom-nav-h)] z-30 mx-auto max-w-[430px] glass px-5 py-3">
          <Button full size="lg" icon={<Lock size={18} />} disabled={!allSelected} loading={placeOrder.isPending} onClick={pay}>
            Pay {money(productTotal)}
          </Button>
        </div>
      )}

      <AddressSheet open={addressOpen} onOpenChange={setAddressOpen} />
      {processing && <PaymentProcessing amount={processingTotal} />}
    </div>
  )
}
