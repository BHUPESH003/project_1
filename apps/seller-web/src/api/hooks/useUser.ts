import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { AuthUser } from '@/types/api'

/** GET /users/me — the logged-in account profile. */
export function useMe() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.me,
    queryFn: () => apiGet<AuthUser>('/users/me'),
    enabled: isAuthed,
    staleTime: 30_000,
  })
}

/** PATCH /users/me — update name/email. */
export function useUpdateMe() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (input: { name?: string; email?: string }) =>
      apiPatch<AuthUser>('/users/me', input),
    onSuccess: (user) => {
      setUser(user)
      void qc.invalidateQueries({ queryKey: qk.me })
    },
  })
}
