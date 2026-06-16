import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { Banner, BannerInput } from '@/types/api'

export function useBanners() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.banners,
    queryFn: () => apiGet<Banner[]>('/admin/banners'),
    enabled: isAuthed,
  })
}

export function useBanner(id: string | undefined) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.banner(id ?? ''),
    queryFn: () => apiGet<Banner>(`/admin/banners/${id}`),
    enabled: isAuthed && !!id,
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BannerInput) => apiPost<Banner>('/admin/banners', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.banners }),
  })
}

export function useUpdateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BannerInput> }) =>
      apiPatch<Banner>(`/admin/banners/${id}`, input),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: qk.banners })
      qc.invalidateQueries({ queryKey: qk.banner(id) })
    },
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/banners/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.banners }),
  })
}
