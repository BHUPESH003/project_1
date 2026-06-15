import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from '@/components/ui/Toaster'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'

import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { RegistrationPage } from '@/pages/onboarding/RegistrationPage'
import { PendingApprovalPage } from '@/pages/onboarding/PendingApprovalPage'
import { SuspendedPage } from '@/pages/onboarding/SuspendedPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage'
import { OrderHistoryPage } from '@/pages/orders/OrderHistoryPage'
import { ProductListPage } from '@/pages/products/ProductListPage'
import { AddEditProductPage } from '@/pages/products/AddEditProductPage'
import { ShopSettingsPage } from '@/pages/shop/ShopSettingsPage'
import { EarningsPage } from '@/pages/shop/EarningsPage'
import { ProfilePage } from '@/pages/shop/ProfilePage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Mobile-first: phone-width frame on desktop, full-bleed on mobile. */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-bg shadow-xl">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-otp" element={<OtpPage />} />

            {/* Authed onboarding (no bottom nav) */}
            <Route element={<RequireAuth />}>
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/pending" element={<PendingApprovalPage />} />
              <Route path="/suspended" element={<SuspendedPage />} />
            </Route>

            {/* Approved seller area */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orders/history" element={<OrderHistoryPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/new" element={<AddEditProductPage />} />
              <Route path="/products/:id" element={<AddEditProductPage />} />
              <Route path="/shop/settings" element={<ShopSettingsPage />} />
              <Route path="/shop/earnings" element={<EarningsPage />} />
              <Route path="/shop/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
