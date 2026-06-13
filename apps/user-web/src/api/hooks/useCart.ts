import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { toNum } from '@/lib/format'
import type { AddCartItemInput, Cart, CartItem, CartSellerGroup } from '@/api/types'

function normalizeCart(res: unknown): Cart {
  const base: Cart = { id: '', status: 'active', items: [] }
  if (!res || typeof res !== 'object') return base
  const r = res as Partial<Cart> & { items?: CartItem[] }
  return { ...base, ...r, items: r.items ?? [] }
}

/** Group flat cart items by seller for the multi-seller cart view. */
export function groupBySeller(cart: Cart | undefined): CartSellerGroup[] {
  if (!cart) return []
  if (cart.sellers?.length) return cart.sellers
  const map = new Map<string, CartSellerGroup>()
  for (const item of cart.items) {
    const sellerId = item.sellerId
    if (!map.has(sellerId)) {
      map.set(sellerId, {
        seller: item.seller ?? { id: sellerId, shopName: 'Shop', imagePath: null, imageUrl: null, status: 'ONLINE' as never },
        items: [],
        subtotal: 0,
      })
    }
    const group = map.get(sellerId)!
    group.items.push(item)
    const line = item.lineTotal != null ? toNum(item.lineTotal) : toNum(item.priceAtAdd) * item.quantity
    group.subtotal = toNum(group.subtotal) + line
  }
  return [...map.values()]
}

/** GET /cart */
export function useCart() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.cart,
    queryFn: async () => normalizeCart(await apiGet<unknown>('/cart')),
    enabled: isAuthed,
    staleTime: 10_000,
  })
}

/** Total item quantity in the cart (for nav badge / floating bar). */
export function useCartCount(): number {
  const { data } = useCart()
  if (!data) return 0
  return data.items.reduce((sum, it) => sum + (it.quantity || 1), 0)
}

export function useAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    // The backend derives the seller from productId and rejects a `sellerId`
    // field (forbidNonWhitelisted), so strip it from the request body.
    mutationFn: ({ productId, quantity, payload }: AddCartItemInput) =>
      apiPost<CartItem>('/cart/items', { productId, quantity, payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cart }),
  })
}

export function useUpdateCartItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity, payload }: { id: string; quantity?: number; payload?: Record<string, unknown> }) =>
      apiPatch<CartItem>(`/cart/items/${id}`, { quantity, payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cart }),
  })
}

export function useRemoveCartItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/cart/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cart }),
  })
}

export interface PrintFileConfig {
  fileId: string
  payload: Record<string, unknown>
}

/**
 * Add a printing item: create the cart item, then attach each configured
 * file (POST /cart/items/:id/files).
 */
export function useAddPrintingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      payload,
      files,
    }: {
      /** Accepted for call-site convenience but not sent — backend derives seller from productId. */
      sellerId?: string
      productId?: string
      payload?: Record<string, unknown>
      files: PrintFileConfig[]
    }) => {
      const item = await apiPost<CartItem>('/cart/items', { productId, payload, quantity: 1 })
      for (const f of files) {
        await apiPost(`/cart/items/${item.id}/files`, { fileId: f.fileId, payload: f.payload })
      }
      return item
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cart }),
  })
}
