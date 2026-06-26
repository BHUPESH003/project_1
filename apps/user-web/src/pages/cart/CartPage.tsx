import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@repo/icons";
import {
  useCart,
  groupBySeller,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/api/hooks/useCart";
import {
  useMultiCheckout,
  usePlaceMultiOrder,
  createMultiPaymentIntent,
  verifyMultiPayment,
} from "@/api/hooks/useCheckout";
import { useCreateAddress } from "@/api/hooks/useUser";
import { AddressOverlay } from "@/components/sheets/AddressOverlay";
import { AddressCompleteSheet } from "@/components/sheets/AddressCompleteSheet";
import { DeliveryOptionsSheet } from "@/components/sheets/DeliveryOptionsSheet";
import { BillSummarySheet } from "@/components/sheets/BillSummarySheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { PaymentProcessing } from "@/pages/payment/PaymentProcessing";
import { useAddressStore } from "@/stores/addressStore";
import { getErrorMessage } from "@/api/client";
import { openRazorpay } from "@/lib/razorpay";
import { assetUrl, minutes, money, toNum } from "@/lib/format";
import { qk } from "@/lib/constants";
import type {
  CartItem,
  CartItemFile,
  CheckoutSellerSummary,
} from "@/api/types";
import type { SelectedAddress } from "@/stores/addressStore";
import { cn } from "@/lib/cn";

function fileConfigSummary(f: CartItemFile): string {
  const p = f.payload as {
    color?: string;
    paperSize?: string;
    copies?: number;
  };
  const parts: string[] = [];
  if (p.color) parts.push(p.color === "COLOR" ? "Colour" : "B&W");
  if (p.paperSize) parts.push(p.paperSize);
  if (p.copies) parts.push(`${p.copies} ${p.copies === 1 ? "copy" : "copies"}`);
  return parts.join(" · ");
}

function lineTotal(item: CartItem): number {
  if (item.lineTotal != null) return toNum(item.lineTotal);
  if (item.files?.length) {
    return item.files.reduce(
      (s, f) =>
        s +
        toNum((f.payload as { estimatedPrice?: number }).estimatedPrice ?? 0),
      0,
    );
  }
  return toNum(item.priceAtAdd) * item.quantity;
}

export function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const address = useAddressStore((s) => s.selectedAddress);
  const setAddress = useAddressStore((s) => s.setAddress);
  const createAddress = useCreateAddress();
  const ensuring = useRef(false);

  // ── Cart data ─────────────────────────────────────────────────────────────
  const {
    data: cart,
    isLoading: cartLoading,
    isError: cartError,
    refetch,
  } = useCart();
  const remove = useRemoveCartItem();
  const update = useUpdateCartItem();
  const groups = groupBySeller(cart);
  const isEmpty = !cartLoading && groups.length === 0;

  // ── Ensure address has a saved id ─────────────────────────────────────────
  // Checkout needs a persisted address id (not just a local pin).
  useEffect(() => {
    if (address && !address.id && !ensuring.current) {
      ensuring.current = true;
      createAddress
        .mutateAsync({
          label: address.label,
          addressLine: address.addressLine,
          receiverName: address.receiverName ?? undefined,
          receiverPhone: address.receiverPhone ?? undefined,
          latitude: address.latitude,
          longitude: address.longitude,
        })
        .then((saved) => setAddress({ ...address, id: saved.id }))
        .catch(() => undefined)
        .finally(() => {
          ensuring.current = false;
        });
    }
  }, [address, createAddress, setAddress]);

  // ── Checkout / delivery quotes (pre-fetched in background by AppShell) ────
  const checkout = useMultiCheckout(address?.id);
  const sellers = useMemo(() => checkout.data?.sellers ?? [], [checkout.data]);
  const placeOrder = usePlaceMultiOrder();

  // ── Delivery selections: sellerId → quotationId ───────────────────────────
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Bug fix: reset selections when the delivery address changes so stale quotationIds
  // don't persist — the auto-select effect below re-populates with fresh cheapest quotes.
  const addressId = address?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelections({});
  }, [addressId]);

  // Auto-select cheapest when quotes arrive. The reset above ensures we always
  // re-enter this path after an address change.
  useEffect(() => {
    if (!sellers.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelections((prev) => {
      const next = { ...prev };
      for (const s of sellers) {
        if (!next[s.seller.id] && s.deliveryOptions.length > 0) {
          next[s.seller.id] =
            s.recommendations?.cheapest ?? s.deliveryOptions[0].quotationId;
        }
      }
      return next;
    });
  }, [sellers]);

  // ── Delivery fee online/at-door toggle (per seller, default online) ──────
  const [payDeliveryOnline, setPayDeliveryOnline] = useState<
    Record<string, boolean>
  >({});
  const isPayingOnline = (sellerId: string) =>
    payDeliveryOnline[sellerId] !== false;

  // ── Sheet state ───────────────────────────────────────────────────────────
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressCompleteOpen, setAddressCompleteOpen] = useState(false);
  const [deliverySeller, setDeliverySeller] =
    useState<CheckoutSellerSummary | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // ── Totals ────────────────────────────────────────────────────────────────
  const cartSubtotal = groups.reduce(
    (s, g) => s + g.items.reduce((gs, it) => gs + lineTotal(it), 0),
    0,
  );
  const checkoutItemsTotal = sellers.reduce(
    (s, sel) => s + toNum(sel.bill.total),
    0,
  );
  const deliveryTotal = sellers.reduce((s, sel) => {
    if (!isPayingOnline(sel.seller.id)) return s;
    const opt = sel.deliveryOptions.find(
      (o) => o.quotationId === selections[sel.seller.id],
    );
    return s + (opt ? toNum(opt.feeRupees) : 0);
  }, 0);
  const displayTotal =
    sellers.length > 0 ? checkoutItemsTotal + deliveryTotal : cartSubtotal;
  // Delivery provider is mandatory when options exist for a seller.
  const allSelected =
    sellers.length > 0 &&
    sellers.every(
      (s) =>
        s.deliveryOptions.length === 0 ||
        s.deliveryOptions.some(
          (o) => o.quotationId === selections[s.seller.id],
        ),
    );
  const canPay = allSelected && !!address?.id && !placeOrder.isPending;

  // ── Place order + payment ─────────────────────────────────────────────────
  // Accepts a completed address directly so the function can be called
  // immediately from AddressCompleteSheet.onComplete without waiting for a re-render.
  async function pay(completedAddress?: SelectedAddress) {
    const addr = completedAddress ?? address;
    if (!addr?.id) {
      setAddressOpen(true);
      return;
    }
    // If receiver name is missing, prompt for full delivery details first.
    if (!addr.receiverName?.trim()) {
      setAddressCompleteOpen(true);
      return;
    }
    setProcessing(true);
    try {
      const orderIds = await placeOrder.mutateAsync({
        deliveryAddressId: addr.id,
        sellers: sellers.map((s) => {
          // Delivery is optional — user may skip and arrange/pay separately.
          const sel = s.deliveryOptions.find(
            (o) => o.quotationId === selections[s.seller.id],
          );
          return {
            sellerId: s.seller.id,
            quotationId: sel?.quotationId,
            deliveryFeeRupees: sel ? toNum(sel.feeRupees) : 0,
            estimatedMinutes: sel?.estimatedMinutes,
            vehicleType: sel?.vehicleType,
          };
        }),
      });

      if (!orderIds.length) throw new Error("No orders were created");

      // Build parallel payDeliveryFee flags in the same order as orderIds.
      // sellers[] and the resulting orderIds[] share the same positional index
      // because placeMultiSellerOrder processes body.sellers in order.
      const payDeliveryFeeArr = sellers.map((s) => isPayingOnline(s.seller.id));

      // Single Razorpay checkout for all sellers — user pays once.
      const intent = await createMultiPaymentIntent(
        orderIds,
        payDeliveryFeeArr,
      );
      const rzp = await openRazorpay(intent);
      await verifyMultiPayment(orderIds, rzp, payDeliveryFeeArr);

      // Clear cart only after all payments are verified.
      qc.invalidateQueries({ queryKey: qk.cart });
      navigate("/payment/success", {
        state: { orderIds, amount: checkoutItemsTotal },
        replace: true,
      });
    } catch (e) {
      setProcessing(false);
      navigate("/payment/failure", {
        state: { reason: getErrorMessage(e, "Payment was not completed") },
        replace: true,
      });
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-36 pt-3">
      {/* Address bar */}
      {!isEmpty && (
        <button
          type="button"
          onClick={() => setAddressOpen(true)}
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-left tap"
        >
          <Icon name="mappin" size={16} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-3">
              Deliver to
            </p>
            <p className="truncate text-subhead font-semibold text-text">
              {address?.label ?? "Select address"}
            </p>
          </div>
          <Icon name="chevronright" size={16} className="shrink-0 text-text-3" />
        </button>
      )}

      {/* Loading */}
      {cartLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {/* Error */}
      {cartError && (
        <ErrorState
          onRetry={() => refetch()}
          message="Couldn't load your cart."
        />
      )}

      {/* Empty */}
      {isEmpty && (
        <EmptyState
          icon={<Icon name="basket" size={34} />}
          title="Your cart is empty"
          description="Browse nearby shops and add items to get started."
          action={<Button onClick={() => navigate("/")}>Explore shops</Button>}
        />
      )}

      {/* Seller groups */}
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {groups.map((g) => {
            const checkoutSeller = sellers.find(
              (s) => s.seller.id === g.seller.id,
            );
            const selectedOption = checkoutSeller?.deliveryOptions.find(
              (o) => o.quotationId === selections[g.seller.id],
            );

            return (
              <motion.section
                key={g.seller.id}
                layout
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                {/* Seller header */}
                <button
                  type="button"
                  onClick={() => navigate(`/sellers/${g.seller.id}`)}
                  className="flex w-full items-center gap-2.5 border-b border-border-faint bg-surface-2 px-4 py-3 text-left tap"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-text-3">
                    {assetUrl(g.seller.imagePath, g.seller.imageUrl) ? (
                      <img
                        src={assetUrl(g.seller.imagePath, g.seller.imageUrl)!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon name="storefront" size={16} />
                    )}
                  </span>
                  <span className="flex-1 truncate text-body font-semibold text-text">
                    {g.seller.shopName}
                  </span>
                  <Icon name="chevronright" size={15} className="shrink-0 text-text-3" />
                </button>

                {/* Items */}
                <div className="divide-y divide-border-faint px-4">
                  {g.items.map((item) => {
                    const isPrinting = !!item.files?.length;
                    return (
                      <div key={item.id} className="flex gap-3 py-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-2 text-primary">
                          {isPrinting ? (
                            <Icon name="file" size={20} />
                          ) : (
                            <Icon name="storefront" size={18} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-semibold text-text">
                            {(item.payload as { productName?: string })
                              .productName ??
                              item.product?.name ??
                              "Item"}
                          </p>
                          {isPrinting ? (
                            <div className="mt-0.5 space-y-0.5">
                              {item.files!.map((f) => (
                                <p
                                  key={f.id}
                                  className="truncate text-caption text-text-2"
                                >
                                  {(f.payload as { originalName?: string })
                                    .originalName ??
                                    f.originalName ??
                                    "Document"}
                                  {f.pageCount ? ` · ${f.pageCount}p` : ""} —{" "}
                                  {fileConfigSummary(f)}
                                </p>
                              ))}
                            </div>
                          ) : (
                            item.product?.description && (
                              <p className="line-clamp-1 text-caption text-text-2">
                                {item.product.description}
                              </p>
                            )
                          )}
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-body font-bold text-text mono-num">
                              {money(lineTotal(item))}
                            </span>
                            {isPrinting ? (
                              <button
                                type="button"
                                onClick={() => remove.mutate(item.id)}
                                className="inline-flex items-center gap-1 text-caption font-semibold text-danger"
                              >
                                <Icon name="trash" size={14} /> Remove
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.quantity <= 1
                                      ? remove.mutate(item.id)
                                      : update.mutate({
                                          id: item.id,
                                          quantity: item.quantity - 1,
                                        })
                                  }
                                  className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-primary font-bold text-lg tap"
                                >
                                  −
                                </button>
                                <span className="w-4 text-center text-subhead font-semibold mono-num">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    update.mutate({
                                      id: item.id,
                                      quantity: item.quantity + 1,
                                    })
                                  }
                                  className="grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary font-bold text-lg tap"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery row */}
                <div className="border-t border-border-faint px-4 py-3">
                  {!address?.id ? (
                    <button
                      type="button"
                      onClick={() => setAddressOpen(true)}
                      className="flex items-center gap-1.5 text-caption text-text-3 tap"
                    >
                      <Icon name="truck" size={13} />
                      Select address to see delivery options
                    </button>
                  ) : checkout.isLoading || createAddress.isPending ? (
                    <Skeleton className="h-4 w-48 rounded" />
                  ) : !checkoutSeller ||
                    checkoutSeller.deliveryOptions.length === 0 ? (
                    <p className="text-caption text-text-3">
                      No delivery quotes available — you can pay delivery
                      separately.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setDeliverySeller(checkoutSeller)}
                        className="flex w-full items-center gap-2 tap"
                      >
                        <Icon name="truck" size={13} className="shrink-0 text-primary" />
                        <span className="flex-1 text-caption text-text-2">
                          {selectedOption
                            ? `${selectedOption.displayName || selectedOption.providerName} · ${minutes(selectedOption.estimatedMinutes)} · ${money(toNum(selectedOption.feeRupees))}`
                            : "Select delivery provider"}
                        </span>
                        <span className="text-caption font-semibold text-primary">
                          {selectedOption ? "Change" : "Select"}
                        </span>
                      </button>

                      {/* Fee payment toggle — only shown once a provider is selected */}
                      {selectedOption && (
                        <div className="flex items-center justify-between pl-5">
                          <span className="text-caption text-text-3">
                            Delivery fee payment
                          </span>
                          <div className="flex rounded-lg overflow-hidden border border-border text-micro font-semibold">
                            <button
                              type="button"
                              onClick={() =>
                                setPayDeliveryOnline((p) => ({
                                  ...p,
                                  [g.seller.id]: true,
                                }))
                              }
                              className={cn(
                                "px-2.5 py-1 transition-colors",
                                isPayingOnline(g.seller.id)
                                  ? "bg-primary text-on-primary"
                                  : "text-text-3",
                              )}
                            >
                              Pay online
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPayDeliveryOnline((p) => ({
                                  ...p,
                                  [g.seller.id]: false,
                                }))
                              }
                              className={cn(
                                "px-2.5 py-1 transition-colors border-l border-border",
                                !isPayingOnline(g.seller.id)
                                  ? "bg-primary text-on-primary"
                                  : "text-text-3",
                              )}
                            >
                              At door
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Sticky bottom bar */}
      {groups.length > 0 && (
        <div className="fixed inset-x-0 bottom-(--bottom-nav-h) z-30 mx-auto max-w-107.5 glass border-t border-border-faint px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Bill total — shrink-0 so it never gets squeezed by the button */}
            <button
              type="button"
              onClick={() => sellers.length > 0 && setBillOpen(true)}
              className="shrink-0 flex flex-col items-start tap"
            >
              <span className="text-title-lg font-extrabold text-text mono-num">
                {money(displayTotal)}
              </span>
              {sellers.length > 0 ? (
                <span className="flex items-center gap-0.5 text-caption font-semibold text-primary">
                  View bill <Icon name="chevronright" size={12} />
                </span>
              ) : (
                <span className="text-caption text-text-3">excl. delivery</span>
              )}
            </button>

            {/* Place Order — flex-1 fills the remaining row space (not w-full which overflows) */}
            <Button
              className="flex-1"
              size="lg"
              icon={<Icon name="shieldcheck" size={16} />}
              disabled={sellers.length > 0 ? !canPay : false}
              loading={placeOrder.isPending}
              onClick={sellers.length > 0 ? () => pay() : () => navigate("/")}
            >
              {!address?.id
                ? "Add address"
                : sellers.length === 0 && checkout.isLoading
                  ? "Loading…"
                  : "Place Order"}
            </Button>
          </div>
        </div>
      )}

      {/* Sheets */}
      <AddressOverlay open={addressOpen} onOpenChange={setAddressOpen} />
      <AddressCompleteSheet
        open={addressCompleteOpen}
        onClose={() => setAddressCompleteOpen(false)}
        onComplete={(completed) => pay(completed)}
      />
      <DeliveryOptionsSheet
        open={!!deliverySeller}
        onClose={() => setDeliverySeller(null)}
        seller={deliverySeller}
        selected={
          deliverySeller ? selections[deliverySeller.seller.id] : undefined
        }
        onSelect={(qid) =>
          deliverySeller &&
          setSelections((prev) => ({
            ...prev,
            [deliverySeller.seller.id]: qid,
          }))
        }
      />
      <BillSummarySheet
        open={billOpen}
        onClose={() => setBillOpen(false)}
        sellers={sellers}
        selections={selections}
      />
      {processing && <PaymentProcessing amount={checkoutItemsTotal} />}
    </div>
  );
}
