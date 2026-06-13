import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { AuthUser, CreateAddressInput, UserAddress } from '@/api/types'

/** GET /users/me */
export function useMe() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.me,
    queryFn: () => apiGet<AuthUser>('/users/me'),
    enabled: isAuthed,
    staleTime: 5 * 60_000,
  })
}

/** PATCH /users/me */
export function useUpdateMe() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (input: Partial<Pick<AuthUser, 'name' | 'email' | 'notificationOrderUpdates' | 'notificationPromotions'>>) =>
      apiPatch<AuthUser>('/users/me', input),
    onSuccess: (user) => {
      setUser(user)
      qc.invalidateQueries({ queryKey: qk.me })
    },
  })
}

/** GET /users/me/addresses */
export function useAddresses() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.addresses,
    queryFn: async () => {
      const res = await apiGet<unknown>('/users/me/addresses')
      if (Array.isArray(res)) return res as UserAddress[]
      if (res && typeof res === 'object' && 'addresses' in res)
        return (res as { addresses: UserAddress[] }).addresses ?? []
      return [] as UserAddress[]
    },
    enabled: isAuthed,
    staleTime: 60_000,
  })
}

/** POST /users/me/addresses */
export function useCreateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAddressInput) => apiPost<UserAddress>('/users/me/addresses', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  })
}

/** DELETE /users/me/addresses/:id */
export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/users/me/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  })
}
