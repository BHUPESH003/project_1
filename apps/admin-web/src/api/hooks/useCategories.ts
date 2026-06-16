import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/api'

/** GET /categories — public list (all statuses for admin view). */
export function useCategories() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => apiGet<Category[]>('/categories'),
    enabled: isAuthed,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiPost<Category>('/admin/categories', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      apiPatch<Category>(`/admin/categories/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  })
}
