import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '@/types/api'

export function useMe() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.me,
    queryFn: () => apiGet<UserProfile>('/users/me'),
    enabled: isAuthed,
  })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (input: { name?: string; email?: string }) =>
      apiPatch<UserProfile>('/users/me', input),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: qk.me })
      const current = useAuthStore.getState().user
      if (current) setUser({ ...current, name: user.name, email: user.email })
    },
  })
}
