import axios, {
  type AxiosRequestConfig,
  type AxiosInstance,
  AxiosError,
} from 'axios'
import { useAuthStore } from '@/stores/authStore'

/** Standard backend envelope — see services/api/src/common/dto/RESPONSE_FORMAT.md */
export interface ApiEnvelope<T> {
  code: number
  data: T
  message: string
}

const raw: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 20000,
})

/* ---- Request: attach JWT ---- */
raw.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* ---- Response: single-flight token refresh on 401 ---- */
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState()
  if (!refreshToken) return null
  try {
    // Bare axios (not `raw`) so we don't recurse through this interceptor.
    const res = await axios.post('/api/auth/refresh-token', { refreshToken })
    const accessToken: string | undefined = res.data?.data?.accessToken
    const newRefresh: string | undefined = res.data?.data?.refreshToken
    if (!accessToken) throw new Error('No access token in refresh response')
    const store = useAuthStore.getState()
    store.setToken(accessToken)
    if (newRefresh) {
      useAuthStore.setState({ refreshToken: newRefresh })
    }
    return accessToken
  } catch {
    useAuthStore.getState().logout()
    return null
  }
}

raw.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const isRefreshCall = original?.url?.includes('/auth/refresh-token')

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      const newToken = await refreshPromise
      if (newToken) {
        original.headers = original.headers ?? {}
        ;(original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
        return raw(original)
      }
    }
    return Promise.reject(error)
  },
)

/* ---- Typed helpers that unwrap the `{ code, data, message }` envelope ---- */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await raw.get<ApiEnvelope<T>>(url, config)
  return res.data.data
}
export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await raw.post<ApiEnvelope<T>>(url, body, config)
  return res.data.data
}
export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await raw.patch<ApiEnvelope<T>>(url, body, config)
  return res.data.data
}
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await raw.delete<ApiEnvelope<T>>(url, config)
  return res.data.data
}

/** Extract a human-readable message from an API error. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof AxiosError) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message
    if (msg) return msg
    if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.'
    if (!err.response) return 'Network error. Check your connection.'
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export { raw as axiosInstance }
