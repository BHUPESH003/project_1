import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from '@/components/ui/Toaster'
import { Spinner } from '@/components/ui/Spinner'
import { RequireAdmin } from '@/components/layout/RequireAdmin'
import { AdminShell } from '@/components/layout/AdminShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { OrdersListPage } from '@/pages/orders/OrdersListPage'
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage'
import { SellersListPage } from '@/pages/sellers/SellersListPage'
import { SellerDetailPage } from '@/pages/sellers/SellerDetailPage'
import { BannersListPage } from '@/pages/banners/BannersListPage'
import { BannerFormPage } from '@/pages/banners/BannerFormPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { PayoutsPage } from '@/pages/PayoutsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotificationsPage } from '@/pages/NotificationsPage'

// Analytics pulls in Recharts (~400 KB) — load it on demand.
const AnalyticsPage = lazy(() =>
  import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)

function PageFallback() {
  return (
    <div className="grid place-items-center py-20 text-text-3">
      <Spinner size={28} />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-otp" element={<OtpPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Admin area */}
          <Route element={<RequireAdmin />}>
            <Route element={<AdminShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/orders" element={<OrdersListPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/sellers" element={<SellersListPage />} />
              <Route path="/sellers/:id" element={<SellerDetailPage />} />
              <Route path="/banners" element={<BannersListPage />} />
              <Route path="/banners/new" element={<BannerFormPage />} />
              <Route path="/banners/:id/edit" element={<BannerFormPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route
                path="/analytics"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
